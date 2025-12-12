"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Slot, LedgerEntry, DashboardStats, Reservation } from "./types"
import { initialSlots, initialLedger, calculateStats, currentUser } from "./mock-data"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface CryoContextType {
  slots: Slot[]
  ledger: LedgerEntry[]
  stats: DashboardStats
  selectedSlot: Slot | null
  isDrawerOpen: boolean
  heatmapEnabled: boolean
  connectionStatus: "connected" | "connecting" | "disconnected"
  activeReservation: Reservation | null

  // Actions
  setSelectedSlot: (slot: Slot | null) => void
  openDrawer: (slot: Slot) => void
  closeDrawer: () => void
  toggleHeatmap: () => void
  holdSlot: (slotId: string) => Promise<Reservation>
  confirmBooking: (reservationId: string, data: { manifestId: string; priority: string }) => Promise<void>
  cancelReservation: (reservationId: string) => void
  simulateTraffic: () => void
  simulateFailure: () => void
  addLedgerEntry: (entry: LedgerEntry) => void
  updateSlot: (slotId: string, updates: Partial<Slot>) => void
}

const CryoContext = createContext<CryoContextType | null>(null)

export function CryoProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialLedger)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("connecting")
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)
  const [useRealBackend, setUseRealBackend] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  const stats = calculateStats(slots)

  // Mark hydration complete on first render
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const socket: WebSocket | null = null

    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        })
        if (response.ok) {
          setConnectionStatus("connected")
          setUseRealBackend(true)

          // Fetch current user from backend
          try {
            const userResponse = await fetch(`${API_BASE_URL}/api/users/first`)
            if (userResponse.ok) {
              const userData = await userResponse.json()
              if (userData.user) {
                // Update currentUser with real ID from backend
                currentUser.id = userData.user.id
              }
            }
          } catch (e) {
            console.warn("[CryoVault] Could not fetch user")
          }

          // Fetch initial slots from backend
          const slotsResponse = await fetch(`${API_BASE_URL}/api/slots`)
          if (slotsResponse.ok) {
            const slotsData = await slotsResponse.json()
            if (slotsData.slots) setSlots(slotsData.slots)
          }

          // Fetch initial ledger
          const ledgerResponse = await fetch(`${API_BASE_URL}/api/ledger`)
          if (ledgerResponse.ok) {
            const ledgerData = await ledgerResponse.json()
            if (ledgerData.entries) setLedger(ledgerData.entries)
          }
        } else {
          throw new Error("Backend unavailable")
        }
      } catch {
        // Fallback to mock mode
        console.log("[CryoVault] Backend unavailable, using demo mode")
        setConnectionStatus("disconnected")
        setUseRealBackend(false)
      }
    }

    checkBackend()

    // Retry connection every 10 seconds if disconnected
    const interval = setInterval(() => {
      if (!useRealBackend) checkBackend()
    }, 10000)

    return () => {
      clearInterval(interval)
      if (socket) socket.close()
    }
  }, [useRealBackend, isHydrated])

  const openDrawer = useCallback((slot: Slot) => {
    setSelectedSlot(slot)
    setIsDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setActiveReservation(null)
    setTimeout(() => setSelectedSlot(null), 300)
  }, [])

  const toggleHeatmap = useCallback(() => {
    setHeatmapEnabled((prev) => !prev)
  }, [])

  const holdSlot = useCallback(
    async (slotId: string): Promise<Reservation> => {
      if (useRealBackend) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/hold`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slotId, userId: currentUser.id }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to hold slot")
          }

          const data = await response.json()
          const reservation = data.reservation as Reservation

          setSlots((prev) =>
            prev.map((slot) => (slot.id === slotId ? { ...slot, status: "RESERVED" as const, reservation } : slot)),
          )
          setActiveReservation(reservation)
          return reservation
        } catch (error) {
          console.error("[CryoVault] Hold API error:", error)
          throw error
        }
      }

      // Fallback mock implementation
      await new Promise((resolve) => setTimeout(resolve, 300))

      const reservation: Reservation = {
        id: `res-${Date.now()}`,
        slotId,
        userId: currentUser.id,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        status: "PENDING",
        createdAt: new Date().toISOString(),
      }

      setSlots((prev) =>
        prev.map((slot) => (slot.id === slotId ? { ...slot, status: "RESERVED" as const, reservation } : slot)),
      )

      setActiveReservation(reservation)
      return reservation
    },
    [useRealBackend],
  )

  const confirmBooking = useCallback(
    async (reservationId: string, data: { manifestId: string; priority: string }) => {
      if (useRealBackend) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/book`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservationId, ...data }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to confirm booking")
          }

          const result = await response.json()

          // Update local state with response
          if (result.slot) {
            setSlots((prev) => prev.map((s) => (s.id === result.slot.id ? result.slot : s)))
          }
          if (result.ledgerEntry) {
            setLedger((prev) => [...prev, result.ledgerEntry])
          }

          setActiveReservation(null)
          return
        } catch (error) {
          console.error("[CryoVault] Book API error:", error)
          throw error
        }
      }

      // Fallback mock implementation
      await new Promise((resolve) => setTimeout(resolve, 500))

      const slot = slots.find((s) => s.reservation?.id === reservationId)
      if (!slot) throw new Error("Reservation not found")

      const lastEntry = ledger[ledger.length - 1]
      const newEntry: LedgerEntry = {
        id: `ledger-${Date.now()}`,
        bookingId: `book-${Date.now()}`,
        previousHash: lastEntry?.dataHash || "0000000000000000",
        dataHash: Math.random().toString(36).substring(2, 18),
        nonce: Math.floor(Math.random() * 100000),
        timestamp: new Date().toISOString(),
        action: "BOOKING_CONFIRMED",
        slotName: slot.name,
        verified: true,
      }

      setLedger((prev) => [...prev, newEntry])

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id
            ? {
                ...s,
                status: "OCCUPIED" as const,
                reservation: undefined,
                booking: {
                  id: newEntry.bookingId,
                  slotId: s.id,
                  userId: currentUser.id,
                  manifestId: data.manifestId,
                  priority: data.priority as "STANDARD" | "PRIORITY" | "EMERGENCY",
                  confirmedAt: new Date().toISOString(),
                },
              }
            : s,
        ),
      )

      setActiveReservation(null)
    },
    [slots, ledger, useRealBackend],
  )

  const cancelReservation = useCallback((reservationId: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.reservation?.id === reservationId
          ? { ...slot, status: "AVAILABLE" as const, reservation: undefined }
          : slot,
      ),
    )
    setActiveReservation(null)
  }, [])

  const simulateTraffic = useCallback(async () => {
    if (useRealBackend) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/simulate/traffic`, { method: "POST" })
        if (response.ok) {
          const data = await response.json()
          if (data.slots) setSlots(data.slots)
          if (data.ledgerEntry) setLedger((prev) => [...prev, data.ledgerEntry])
          return
        }
      } catch (error) {
        console.error("[CryoVault] Simulate traffic error:", error)
      }
    }

    // Fallback mock
    const numChanges = 3 + Math.floor(Math.random() * 3)
    const shuffled = [...slots].sort(() => Math.random() - 0.5)
    const toChange = shuffled.slice(0, numChanges)

    setSlots((prev) =>
      prev.map((slot) => {
        if (toChange.find((s) => s.id === slot.id)) {
          const statuses: Slot["status"][] = ["AVAILABLE", "RESERVED", "OCCUPIED"]
          const newStatus = statuses[Math.floor(Math.random() * statuses.length)]
          return { ...slot, status: newStatus, reservation: undefined, booking: undefined }
        }
        return slot
      }),
    )

    const lastEntry = ledger[ledger.length - 1]
    const newEntry: LedgerEntry = {
      id: `ledger-${Date.now()}`,
      bookingId: `sim-${Date.now()}`,
      previousHash: lastEntry?.dataHash || "0000000000000000",
      dataHash: Math.random().toString(36).substring(2, 18),
      nonce: Math.floor(Math.random() * 100000),
      timestamp: new Date().toISOString(),
      action: "TRAFFIC_SIMULATION",
      verified: true,
    }
    setLedger((prev) => [...prev, newEntry])
  }, [slots, ledger, useRealBackend])

  const simulateFailure = useCallback(async () => {
    if (useRealBackend) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/simulate/failure`, { method: "POST" })
        if (response.ok) {
          const data = await response.json()
          if (data.slot) {
            setSlots((prev) => prev.map((s) => (s.id === data.slot.id ? data.slot : s)))
          }
          if (data.ledgerEntry) setLedger((prev) => [...prev, data.ledgerEntry])
          return
        }
      } catch (error) {
        console.error("[CryoVault] Simulate failure error:", error)
      }
    }

    // Fallback mock
    const availableSlots = slots.filter((s) => s.tempStatus !== "CRITICAL")
    if (availableSlots.length === 0) return

    const targetSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)]

    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === targetSlot.id
          ? {
              ...slot,
              tempStatus: "CRITICAL" as const,
              temperature: -62 + Math.random() * 5,
              sparklineData: [...slot.sparklineData.slice(1), -60 + Math.random() * 3],
            }
          : slot,
      ),
    )

    const lastEntry = ledger[ledger.length - 1]
    const newEntry: LedgerEntry = {
      id: `ledger-${Date.now()}`,
      bookingId: `alert-${Date.now()}`,
      previousHash: lastEntry?.dataHash || "0000000000000000",
      dataHash: Math.random().toString(36).substring(2, 18),
      nonce: Math.floor(Math.random() * 100000),
      timestamp: new Date().toISOString(),
      action: "TEMP_CRITICAL",
      slotName: targetSlot.name,
      verified: true,
    }
    setLedger((prev) => [...prev, newEntry])
  }, [slots, ledger, useRealBackend])

  const addLedgerEntry = useCallback((entry: LedgerEntry) => {
    setLedger((prev) => [...prev, entry])
  }, [])

  const updateSlot = useCallback((slotId: string, updates: Partial<Slot>) => {
    setSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot)))
  }, [])

  return (
    <CryoContext.Provider
      value={{
        slots,
        ledger,
        stats,
        selectedSlot,
        isDrawerOpen,
        heatmapEnabled,
        connectionStatus,
        activeReservation,
        setSelectedSlot,
        openDrawer,
        closeDrawer,
        toggleHeatmap,
        holdSlot,
        confirmBooking,
        cancelReservation,
        simulateTraffic,
        simulateFailure,
        addLedgerEntry,
        updateSlot,
      }}
    >
      {children}
    </CryoContext.Provider>
  )
}

export function useCryo() {
  const context = useContext(CryoContext)
  if (!context) {
    throw new Error("useCryo must be used within a CryoProvider")
  }
  return context
}
