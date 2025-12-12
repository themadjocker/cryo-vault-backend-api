// Simulation routes for demo purposes

import { Router } from "express"
import prisma from "../lib/prisma"
import { createLedgerEntry } from "../lib/ledger-service"
import type { Server as SocketServer } from "socket.io"

export const simulateRouter = Router()

// POST /api/simulate/traffic - Randomize slot statuses
simulateRouter.post("/traffic", async (req, res) => {
  try {
    const io: SocketServer = req.app.get("io")

    // Get all slots
    const slots = await prisma.slot.findMany()

    // Randomly change 3-5 slots
    const numChanges = 3 + Math.floor(Math.random() * 3)
    const shuffled = [...slots].sort(() => Math.random() - 0.5)
    const toChange = shuffled.slice(0, numChanges)

    const updates = []

    for (const slot of toChange) {
      const statuses = ["AVAILABLE", "RESERVED", "OCCUPIED"] as const
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)]

      const updated = await prisma.slot.update({
        where: { id: slot.id },
        data: { status: newStatus },
      })

      updates.push(updated)

      // Emit update
      io.to("cryovault").emit("slot_update", {
        slotId: updated.id,
        status: updated.status,
      })
    }

    res.json({
      success: true,
      message: `Updated ${updates.length} slots`,
      slots: updates,
    })
  } catch (error) {
    console.error("Traffic simulation error:", error)
    res.status(500).json({
      success: false,
      error: "SIMULATION_ERROR",
    })
  }
})

// POST /api/simulate/failure - Create temperature failure
simulateRouter.post("/failure", async (req, res) => {
  try {
    const io: SocketServer = req.app.get("io")

    // Find a non-critical slot
    const slot = await prisma.slot.findFirst({
      where: { tempStatus: { not: "CRITICAL" } },
    })

    if (!slot) {
      return res.status(404).json({
        success: false,
        error: "NO_AVAILABLE_SLOTS",
      })
    }

    // Update to critical
    const criticalTemp = -62 + Math.random() * 5
    const updated = await prisma.slot.update({
      where: { id: slot.id },
      data: {
        tempStatus: "CRITICAL",
        temperature: Math.round(criticalTemp * 10) / 10,
      },
    })

    // If slot is occupied, create a ledger entry
    if (slot.status === "OCCUPIED") {
      const booking = await prisma.booking.findFirst({
        where: { slotId: slot.id, releasedAt: null },
      })

      if (booking) {
        const ledgerEntry = await createLedgerEntry(booking, "TEMP_CRITICAL", slot.name)

        io.to("cryovault").emit("ledger_update", {
          entry: ledgerEntry,
        })
      }
    }

    // Emit update
    io.to("cryovault").emit("slot_update", {
      slotId: updated.id,
      status: updated.status,
      tempStatus: updated.tempStatus,
      temperature: updated.temperature,
    })

    res.json({
      success: true,
      message: `Slot ${slot.name} is now CRITICAL`,
      slot: updated,
    })
  } catch (error) {
    console.error("Failure simulation error:", error)
    res.status(500).json({
      success: false,
      error: "SIMULATION_ERROR",
    })
  }
})
