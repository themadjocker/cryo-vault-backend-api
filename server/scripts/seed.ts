// CryoVault Database Seed Script (copied to server for local execution)

import { PrismaClient, SlotStatus, TempStatus, UserRole } from "@prisma/client"
import * as bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  if (process.env.NODE_ENV !== "production") {
    console.log("Clearing existing data...")
    await prisma.ledger.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.reservation.deleteMany()
    await prisma.slot.deleteMany()
    await prisma.user.deleteMany()
  }

  console.log("Creating users...")
  const passwordHash = await bcrypt.hash("password123", 10)

  const manager = await prisma.user.create({
    data: {
      email: "manager@cryovault.io",
      name: "Dr. Sarah Chen",
      passwordHash,
      role: UserRole.MANAGER,
    },
  })

  const auditor = await prisma.user.create({
    data: {
      email: "auditor@cryovault.io",
      name: "James Wilson",
      passwordHash,
      role: UserRole.AUDITOR,
    },
  })

  console.log(`Created users: ${manager.email}, ${auditor.email}`)

  console.log("Creating 20 freezer slots...")
  const slots = []

  for (let row = 1; row <= 5; row++) {
    for (let col = 1; col <= 4; col++) {
      const name = `F${row}-${String.fromCharCode(64 + col)}`

      const rand = Math.random()
      let status: SlotStatus = SlotStatus.AVAILABLE
      if (rand > 0.75) status = SlotStatus.OCCUPIED
      else if (rand > 0.6) status = SlotStatus.RESERVED

      const baseTemp = -70 + (Math.random() - 0.5) * 4

      let tempStatus: TempStatus = TempStatus.NORMAL
      if (baseTemp > -68) tempStatus = TempStatus.WARNING
      if (baseTemp > -65) tempStatus = TempStatus.CRITICAL

      const slot = await prisma.slot.create({
        data: {
          name,
          status,
          tempStatus,
          temperature: Math.round(baseTemp * 10) / 10,
          targetTemp: -70.0,
          lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      })

      slots.push(slot)
    }
  }

  console.log(`Created ${slots.length} freezer slots`)

  const occupiedSlots = slots.filter((s) => s.status === SlotStatus.OCCUPIED)
  console.log(`Creating bookings for ${occupiedSlots.length} occupied slots...`)

  let previousHash = "0000000000000000"

  for (const slot of occupiedSlots) {
    const booking = await prisma.booking.create({
      data: {
        slotId: slot.id,
        userId: manager.id,
        manifestId: `MAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        priority: "STANDARD",
        vaccineType: ["Pfizer-BioNTech", "Moderna", "Johnson & Johnson", "AstraZeneca"][Math.floor(Math.random() * 4)],
        batchNumber: `VAX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        quantity: Math.floor(Math.random() * 500) + 100,
        confirmedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    })

    const dataHash = Buffer.from(
      JSON.stringify({
        bookingId: booking.id,
        slotId: slot.id,
        manifestId: booking.manifestId,
        timestamp: booking.confirmedAt,
      }),
    )
      .toString("base64")
      .substring(0, 16)

    await prisma.ledger.create({
      data: {
        bookingId: booking.id,
        previousHash,
        dataHash,
        nonce: Math.floor(Math.random() * 100000),
        action: "BOOKING_CONFIRMED",
        slotName: slot.name,
        timestamp: booking.confirmedAt,
      },
    })

    previousHash = dataHash
  }

  const reservedSlots = slots.filter((s) => s.status === SlotStatus.RESERVED)
  console.log(`Creating reservations for ${reservedSlots.length} reserved slots...`)

  for (const slot of reservedSlots) {
    await prisma.reservation.create({
      data: {
        slotId: slot.id,
        userId: manager.id,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        status: "PENDING",
      },
    })
  }

  const stats = {
    users: await prisma.user.count(),
    slots: await prisma.slot.count(),
    available: slots.filter((s) => s.status === SlotStatus.AVAILABLE).length,
    reserved: slots.filter((s) => s.status === SlotStatus.RESERVED).length,
    occupied: slots.filter((s) => s.status === SlotStatus.OCCUPIED).length,
    bookings: await prisma.booking.count(),
    ledgerEntries: await prisma.ledger.count(),
  }

  console.log("\n✅ Seed completed!")
  console.log("📊 Summary:")
  console.log(`   Users: ${stats.users}`)
  console.log(
    `   Slots: ${stats.slots} (${stats.available} available, ${stats.reserved} reserved, ${stats.occupied} occupied)`,
  )
  console.log(`   Bookings: ${stats.bookings}`)
  console.log(`   Ledger Entries: ${stats.ledgerEntries}`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
