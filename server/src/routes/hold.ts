// POST /api/hold - Create pending reservation with 2-min expiry

import { Router } from "express"
import { z } from "zod"
import prisma from "../lib/prisma"
import type { Server as SocketServer } from "socket.io"

export const holdRouter = Router()

const holdSchema = z.object({
  slotId: z.string().min(1),
  userId: z.string().min(1),
})

holdRouter.post("/", async (req, res) => {
  try {
    const { slotId, userId } = holdSchema.parse(req.body)
    const io: SocketServer = req.app.get("io")

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Check if slot exists and is available
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: {
          reservations: {
            where: { status: "PENDING" },
          },
        },
      })

      if (!slot) {
        throw new Error("SLOT_NOT_FOUND")
      }

      if (slot.status !== "AVAILABLE") {
        throw new Error("SLOT_NOT_AVAILABLE")
      }

      // Check for existing pending reservation (should be caught by partial unique index)
      if (slot.reservations.length > 0) {
        throw new Error("SLOT_ALREADY_RESERVED")
      }

      // Create reservation with 2-minute expiry
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000)

      const reservation = await tx.reservation.create({
        data: {
          slotId,
          userId,
          expiresAt,
          status: "PENDING",
        },
      })

      // Update slot status
      await tx.slot.update({
        where: { id: slotId },
        data: { status: "RESERVED" },
      })

      return { reservation, slot }
    })

    // Emit real-time update
    io.to("cryovault").emit("slot_update", {
      slotId: result.slot.id,
      status: "RESERVED",
      reservation: result.reservation,
    })

    res.status(201).json({
      success: true,
      reservation: result.reservation,
      expiresIn: 120, // seconds
    })
  } catch (error) {
    console.error("Hold error:", error)

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        details: error.errors,
      })
    }

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR"

    const statusMap: Record<string, number> = {
      SLOT_NOT_FOUND: 404,
      SLOT_NOT_AVAILABLE: 409,
      SLOT_ALREADY_RESERVED: 409,
    }

    res.status(statusMap[message] || 500).json({
      success: false,
      error: message,
    })
  }
})
