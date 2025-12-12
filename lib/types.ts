// CryoVault Type Definitions

export type SlotStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED"
export type TempStatus = "NORMAL" | "WARNING" | "CRITICAL"
export type UserRole = "MANAGER" | "AUDITOR"
export type ReservationStatus = "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED"
export type Priority = "STANDARD" | "PRIORITY" | "EMERGENCY"

export interface Slot {
  id: string
  name: string
  status: SlotStatus
  tempStatus: TempStatus
  temperature: number
  targetTemp: number
  lastMaintenance: string
  sparklineData: number[]
  reservation?: Reservation
  booking?: Booking
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
}

export interface Reservation {
  id: string
  slotId: string
  userId: string
  expiresAt: string
  status: ReservationStatus
  createdAt: string
}

export interface Booking {
  id: string
  slotId: string
  userId: string
  manifestId: string
  priority: Priority
  confirmedAt: string
  vaccineType?: string
  batchNumber?: string
  quantity?: number
}

export interface LedgerEntry {
  id: string
  bookingId: string
  previousHash: string
  dataHash: string
  nonce: number
  timestamp: string
  action: string
  slotName?: string
  verified?: boolean
}

export interface DashboardStats {
  availableSlots: number
  totalSlots: number
  avgTemperature: number
  pendingActions: number
  verifiedBlocks: number
}

export interface HoldRequest {
  slotId: string
  userId: string
}

export interface BookRequest {
  reservationId: string
  manifestId: string
  priority: Priority
  vaccineType?: string
  batchNumber?: string
  quantity?: number
}
