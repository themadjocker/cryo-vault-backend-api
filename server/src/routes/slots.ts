// GET /api/slots - Retrieve all slots with current state

import { Router } from "express"
import prisma from "../lib/prisma"

export const slotsRouter = Router()

slotsRouter.get("/", async (_, res) => {
  try {
    const slots = await prisma.slot.findMany({
      orderBy: { name: "asc" },
      include: {
        reservations: {
          where: { status: "PENDING" },
          take: 1,
        },
        bookings: {
          where: { releasedAt: null },
          take: 1,
          orderBy: { confirmedAt: "desc" },
        },
      },
    })

    // Transform to include active reservation/booking directly
    const transformedSlots = slots.map((slot) => ({
      id: slot.id,
      name: slot.name,
      status: slot.status,
      tempStatus: slot.tempStatus,
      temperature: slot.temperature,
      targetTemp: slot.targetTemp,
      lastMaintenance: slot.lastMaintenance,
      reservation: slot.reservations[0] || null,
      booking: slot.bookings[0] || null,
      // Generate mock sparkline data (in production, this would come from time-series data)
      sparklineData: Array.from({ length: 12 }, () => slot.temperature + (Math.random() - 0.5) * 2),
    }))

    res.json({
      success: true,
      slots: transformedSlots,
      count: transformedSlots.length,
    })
  } catch (error) {
    console.error("Slots fetch error:", error)
    res.status(500).json({
      success: false,
      error: "FETCH_ERROR",
    })
  }
})

// GET /api/slots/:id - Get single slot
slotsRouter.get("/:id", async (req, res) => {
  try {
    const slot = await prisma.slot.findUnique({
      where: { id: req.params.id },
      include: {
        reservations: {
          where: { status: "PENDING" },
          take: 1,
        },
        bookings: {
          where: { releasedAt: null },
          take: 1,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!slot) {
      return res.status(404).json({
        success: false,
        error: "SLOT_NOT_FOUND",
      })
    }

    res.json({
      success: true,
      slot: {
        ...slot,
        reservation: slot.reservations[0] || null,
        booking: slot.bookings[0] || null,
        sparklineData: Array.from({ length: 12 }, () => slot.temperature + (Math.random() - 0.5) * 2),
      },
    })
  } catch (error) {
    console.error("Slot fetch error:", error)
    res.status(500).json({
      success: false,
      error: "FETCH_ERROR",
    })
  }
})
