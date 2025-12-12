// POST /api/book - Confirm booking with ledger chain creation

import { Router } from "express"
import { z } from "zod"
import prisma from "../lib/prisma"
import { createLedgerEntry } from "../lib/ledger-service"
import type { Server as SocketServer } from "socket.io"

export const bookRouter = Router()

const bookSchema = z.object({
  reservationId: z.string().min(1),
  manifestId: z.string().min(1),
  priority: z.enum(["STANDARD", "PRIORITY", "EMERGENCY"]).default("STANDARD"),
  vaccineType: z.string().optional(),
  batchNumber: z.string().optional(),
  quantity: z.number().int().positive().optional(),
})

bookRouter.post("/", async (req, res) => {
  try {
    const data = bookSchema.parse(req.body)
    const io: SocketServer = req.app.get("io")

    const result = await prisma.$transaction(async (tx) => {
      // Find and validate reservation
      const reservation = await tx.reservation.findUnique({
        where: { id: data.reservationId },
        include: { slot: true },
      })

      if (!reservation) {
        throw new Error("RESERVATION_NOT_FOUND")
      }

      if (reservation.status !== "PENDING") {
        throw new Error("RESERVATION_NOT_PENDING")
      }

      // Check if reservation has expired
      if (new Date() > reservation.expiresAt) {
        // Mark as expired
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "EXPIRED" },
        })

        await tx.slot.update({
          where: { id: reservation.slotId },
          data: { status: "AVAILABLE" },
        })

        throw new Error("RESERVATION_EXPIRED")
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          slotId: reservation.slotId,
          userId: reservation.userId,
          reservationId: reservation.id,
          manifestId: data.manifestId,
          priority: data.priority,
          vaccineType: data.vaccineType,
          batchNumber: data.batchNumber,
          quantity: data.quantity,
        },
      })

      // Update reservation status
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
      })

      // Update slot status
      await tx.slot.update({
        where: { id: reservation.slotId },
        data: { status: "OCCUPIED" },
      })

      return { booking, slot: reservation.slot }
    })

    // Create ledger entry (outside transaction for performance)
    const ledgerEntry = await createLedgerEntry(result.booking, "BOOKING_CONFIRMED", result.slot.name)

    // Emit real-time updates
    io.to("cryovault").emit("slot_update", {
      slotId: result.slot.id,
      status: "OCCUPIED",
      booking: result.booking,
    })

    io.to("cryovault").emit("ledger_update", {
      entry: ledgerEntry,
    })

    res.status(201).json({
      success: true,
      booking: result.booking,
      ledgerEntry,
    })
  } catch (error) {
    console.error("Book error:", error)

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        details: error.errors,
      })
    }

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR"

    const statusMap: Record<string, number> = {
      RESERVATION_NOT_FOUND: 404,
      RESERVATION_NOT_PENDING: 409,
      RESERVATION_EXPIRED: 410,
    }

    res.status(statusMap[message] || 500).json({
      success: false,
      error: message,
    })
  }
})
