import type { Slot, User, LedgerEntry, DashboardStats } from "./types"

// Generate temperature sparkline data
function generateSparkline(baseTemp: number, variance = 2): number[] {
  return Array.from({ length: 12 }, () => baseTemp + (Math.random() - 0.5) * variance)
}

// Generate initial 20 slots as per spec
export const initialSlots: Slot[] = Array.from({ length: 20 }, (_, i) => {
  const row = Math.floor(i / 4) + 1
  const col = (i % 4) + 1
  const name = `F${row}-${String.fromCharCode(64 + col)}`

  // Randomize status distribution: 60% available, 25% occupied, 15% reserved
  const rand = Math.random()
  let status: Slot["status"] = "AVAILABLE"
  if (rand > 0.75) status = "OCCUPIED"
  else if (rand > 0.6) status = "RESERVED"

  // Base temp around -70°C with some variance
  const baseTemp = -70 + (Math.random() - 0.5) * 4

  // Determine temp status based on deviation from target
  let tempStatus: Slot["tempStatus"] = "NORMAL"
  if (baseTemp > -68) tempStatus = "WARNING"
  if (baseTemp > -65) tempStatus = "CRITICAL"

  return {
    id: `slot-${i + 1}`,
    name,
    status,
    tempStatus,
    temperature: Math.round(baseTemp * 10) / 10,
    targetTemp: -70,
    lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    sparklineData: generateSparkline(baseTemp),
  }
})

// Current user (Manager role)
export const currentUser: User = {
  id: "mock-manager-id", // Will be replaced by backend user ID when fetched
  email: "manager@cryovault.io",
  name: "Dr. Sarah Chen",
  role: "MANAGER",
  avatar: "/placeholder.svg?height=40&width=40",
}

// Initial ledger entries for blockchain audit
export const initialLedger: LedgerEntry[] = [
  {
    id: "ledger-1",
    bookingId: "book-001",
    previousHash: "0000000000000000",
    dataHash: "a1b2c3d4e5f6g7h8",
    nonce: 12847,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: "BOOKING_CONFIRMED",
    slotName: "F1-A",
    verified: true,
  },
  {
    id: "ledger-2",
    bookingId: "book-002",
    previousHash: "a1b2c3d4e5f6g7h8",
    dataHash: "h8g7f6e5d4c3b2a1",
    nonce: 34521,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: "TEMP_VERIFIED",
    slotName: "F2-B",
    verified: true,
  },
  {
    id: "ledger-3",
    bookingId: "book-003",
    previousHash: "h8g7f6e5d4c3b2a1",
    dataHash: "x9y8z7w6v5u4t3s2",
    nonce: 56789,
    timestamp: new Date(Date.now() - 600000).toISOString(),
    action: "SLOT_RELEASED",
    slotName: "F3-C",
    verified: true,
  },
]

// Calculate dashboard stats from slots
export function calculateStats(slots: Slot[]): DashboardStats {
  const availableSlots = slots.filter((s) => s.status === "AVAILABLE").length
  const avgTemperature = slots.reduce((sum, s) => sum + s.temperature, 0) / slots.length
  const pendingActions = slots.filter((s) => s.status === "RESERVED").length

  return {
    availableSlots,
    totalSlots: slots.length,
    avgTemperature: Math.round(avgTemperature * 10) / 10,
    pendingActions,
    verifiedBlocks: initialLedger.length,
  }
}
