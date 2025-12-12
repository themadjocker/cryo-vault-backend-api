// Blockchain-style Ledger Service
// HMAC SHA-256 hash chain implementation

import * as crypto from "crypto"
import prisma from "./prisma"
import type { Booking, Ledger } from "@prisma/client"

const HMAC_SECRET = process.env.HMAC_SECRET || "cryovault-ledger-secret-key"

interface LedgerData {
  bookingId: string
  slotId: string
  manifestId: string
  userId: string
  action: string
  timestamp: Date
}

/**
 * Generate HMAC SHA-256 hash for ledger data
 */
export function generateHash(data: LedgerData, previousHash: string): string {
  const payload = JSON.stringify({
    ...data,
    previousHash,
    timestamp: data.timestamp.toISOString(),
  })

  return crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("hex").substring(0, 16)
}

/**
 * Find a valid nonce (proof of work simulation)
 * In production, this would be more sophisticated
 */
export function findNonce(dataHash: string, difficulty = 2): number {
  let nonce = 0
  const target = "0".repeat(difficulty)

  while (true) {
    const hash = crypto
      .createHash("sha256")
      .update(dataHash + nonce)
      .digest("hex")

    if (hash.startsWith(target)) {
      return nonce
    }
    nonce++

    // Safety limit to prevent infinite loops
    if (nonce > 1000000) {
      return nonce
    }
  }
}

/**
 * Get the last ledger entry (for chain continuity)
 */
export async function getLastLedgerEntry(): Promise<Ledger | null> {
  return prisma.ledger.findFirst({
    orderBy: { timestamp: "desc" },
  })
}

/**
 * Create a new ledger entry with proper chain linkage
 */
export async function createLedgerEntry(booking: Booking, action: string, slotName?: string): Promise<Ledger> {
  const lastEntry = await getLastLedgerEntry()
  const previousHash = lastEntry?.dataHash || "0000000000000000"

  const data: LedgerData = {
    bookingId: booking.id,
    slotId: booking.slotId,
    manifestId: booking.manifestId,
    userId: booking.userId,
    action,
    timestamp: new Date(),
  }

  const dataHash = generateHash(data, previousHash)
  const nonce = findNonce(dataHash)

  return prisma.ledger.create({
    data: {
      bookingId: booking.id,
      previousHash,
      dataHash,
      nonce,
      action,
      slotName,
      timestamp: data.timestamp,
    },
  })
}

/**
 * Verify the integrity of the ledger chain
 */
export async function verifyChainIntegrity(): Promise<{
  valid: boolean
  entries: number
  invalidAt?: string
}> {
  const entries = await prisma.ledger.findMany({
    orderBy: { timestamp: "asc" },
    include: { booking: true },
  })

  if (entries.length === 0) {
    return { valid: true, entries: 0 }
  }

  let previousHash = "0000000000000000"

  for (const entry of entries) {
    // Verify the previous hash matches
    if (entry.previousHash !== previousHash) {
      return {
        valid: false,
        entries: entries.length,
        invalidAt: entry.id,
      }
    }

    // Regenerate the hash to verify
    const expectedHash = generateHash(
      {
        bookingId: entry.bookingId,
        slotId: entry.booking.slotId,
        manifestId: entry.booking.manifestId,
        userId: entry.booking.userId,
        action: entry.action,
        timestamp: entry.timestamp,
      },
      previousHash,
    )

    if (entry.dataHash !== expectedHash) {
      return {
        valid: false,
        entries: entries.length,
        invalidAt: entry.id,
      }
    }

    previousHash = entry.dataHash
  }

  return { valid: true, entries: entries.length }
}

/**
 * Get recent ledger entries for display
 */
export async function getRecentLedgerEntries(limit = 10): Promise<Ledger[]> {
  return prisma.ledger.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  })
}
