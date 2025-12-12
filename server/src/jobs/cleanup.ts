// Cleanup job for expired reservations

import prisma from "../lib/prisma"
import type { Server as SocketServer } from "socket.io"

/**
 * Clean up expired reservations and release slots
 * Runs every 30 seconds via cron
 */
export async function cleanupExpiredReservations(io: SocketServer): Promise<number> {
  const now = new Date()

  // Find expired pending reservations
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    include: {
      slot: true,
    },
  })

  if (expiredReservations.length === 0) {
    return 0
  }

  // Process each expired reservation
  for (const reservation of expiredReservations) {
    await prisma.$transaction(async (tx) => {
      // Update reservation status
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "EXPIRED" },
      })

      // Release the slot
      await tx.slot.update({
        where: { id: reservation.slotId },
        data: { status: "AVAILABLE" },
      })
    })

    // Emit real-time update
    io.to("cryovault").emit("slot_update", {
      slotId: reservation.slotId,
      status: "AVAILABLE",
      reservation: null,
    })

    io.to("cryovault").emit("reservation_expired", {
      reservationId: reservation.id,
      slotId: reservation.slotId,
      slotName: reservation.slot.name,
    })
  }

  return expiredReservations.length
}
