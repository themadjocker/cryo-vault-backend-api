"use client"

import { useState, useEffect, useCallback } from "react"
import { useCryo } from "@/lib/cryo-context"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Clock, Thermometer, AlertTriangle, CheckCircle2, Barcode, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

function generateBatchId(): string {
  const year = new Date().getFullYear()
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `VAC-${year}-${randomPart}`
}

export function ManifestDrawer() {
  const { selectedSlot, isDrawerOpen, closeDrawer, activeReservation, holdSlot, confirmBooking, cancelReservation } =
    useCryo()

  const [step, setStep] = useState<"hold" | "booking">("hold")
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const [manifestId, setManifestId] = useState("")
  const [priority, setPriority] = useState("STANDARD")
  const [batchNumber, setBatchNumber] = useState("")

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setStep("hold")
      setManifestId("")
      setPriority("STANDARD")
      setBatchNumber("")
      setCountdown(120)
    } else {
      setBatchNumber(generateBatchId())
    }
  }, [isDrawerOpen])

  // Countdown timer for reservation
  useEffect(() => {
    if (!activeReservation) return

    const expiresAt = new Date(activeReservation.expiresAt).getTime()

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setCountdown(remaining)

      if (remaining === 0) {
        cancelReservation(activeReservation.id)
        toast.error("Reservation expired", { description: "The slot has been released." })
        closeDrawer()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeReservation, cancelReservation, closeDrawer])

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [closeDrawer])

  const handleHold = async () => {
    if (!selectedSlot) return

    setIsLoading(true)
    try {
      await holdSlot(selectedSlot.id)
      setStep("booking")
      toast.success("Slot reserved", { description: "You have 2 minutes to complete booking." })
    } catch {
      toast.error("Failed to reserve slot")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!activeReservation || !manifestId) return

    setIsLoading(true)
    try {
      await confirmBooking(activeReservation.id, { manifestId, priority })
      toast.success("Booking confirmed", { description: "Ledger entry created." })
      closeDrawer()
    } catch {
      toast.error("Failed to confirm booking")
    } finally {
      setIsLoading(false)
    }
  }

  // Barcode scan simulation
  const handleBarcodeScan = useCallback(() => {
    const audioContext = new (
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 1800
    oscillator.type = "sine"
    gainNode.gain.value = 0.3

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1)

    const scannedId = `VAX-${Date.now().toString(36).toUpperCase()}`
    setBatchNumber(scannedId)
    toast.success("Barcode scanned", { description: `Batch: ${scannedId}` })
  }, [])

  const handleRefreshBatchId = useCallback(() => {
    setBatchNumber(generateBatchId())
  }, [])

  if (!selectedSlot) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            Slot {selectedSlot.name}
            <Badge variant={selectedSlot.status === "AVAILABLE" ? "default" : "secondary"}>{selectedSlot.status}</Badge>
          </SheetTitle>
          <SheetDescription>Manage vaccine storage allocation for this unit.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Slot Info */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span>Current Temperature</span>
              </div>
              <span
                className={cn(
                  "font-mono font-bold",
                  selectedSlot.tempStatus === "NORMAL" && "text-green-600",
                  selectedSlot.tempStatus === "WARNING" && "text-orange-600",
                  selectedSlot.tempStatus === "CRITICAL" && "text-red-600",
                )}
              >
                {selectedSlot.temperature.toFixed(1)}°C
              </span>
            </div>

            {selectedSlot.tempStatus !== "NORMAL" && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md p-2 text-sm",
                  selectedSlot.tempStatus === "WARNING" && "bg-warning/10 text-warning",
                  selectedSlot.tempStatus === "CRITICAL" && "bg-destructive/10 text-destructive",
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                {selectedSlot.tempStatus === "WARNING"
                  ? "Temperature slightly elevated"
                  : "Critical temperature deviation!"}
              </div>
            )}
          </div>

          <Separator />

          {/* Reservation Countdown */}
          {activeReservation && (
            <div className="rounded-lg border-2 border-warning bg-warning/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-medium">Reservation Timer</span>
                </div>
                <span
                  className={cn("text-2xl font-mono font-bold", countdown < 30 ? "text-destructive" : "text-warning")}
                >
                  {formatTime(countdown)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete booking before time expires or the slot will be released.
              </p>
            </div>
          )}

          {/* Step: Hold */}
          {step === "hold" && selectedSlot.status === "AVAILABLE" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reserve this slot for 2 minutes while you prepare the manifest details.
              </p>
              <Button onClick={handleHold} className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  "Hold This Slot"
                )}
              </Button>
            </div>
          )}

          {/* Step: Booking Form */}
          {step === "booking" && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleConfirm()
              }}
              className="space-y-4"
            >
              {/* Manifest ID */}
              <div className="space-y-2">
                <Label htmlFor="manifest-id">Manifest ID *</Label>
                <Input
                  id="manifest-id"
                  value={manifestId}
                  onChange={(e) => setManifestId(e.target.value)}
                  placeholder="MAN-2024-0001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-number">Batch Number (Auto-generated)</Label>
                <div className="flex gap-2">
                  <Input id="batch-number" value={batchNumber} readOnly className="bg-slate-50 font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshBatchId}
                    aria-label="Regenerate batch ID"
                    title="Generate new batch ID"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleBarcodeScan}
                    aria-label="Scan barcode"
                    title="Scan barcode"
                  >
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-3">
                <Label>Priority Level</Label>
                <RadioGroup value={priority} onValueChange={setPriority}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="STANDARD" id="standard" />
                    <Label htmlFor="standard" className="font-normal">
                      Standard
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PRIORITY" id="priority" />
                    <Label htmlFor="priority" className="font-normal">
                      Priority
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EMERGENCY" id="emergency" />
                    <Label htmlFor="emergency" className="font-normal text-destructive">
                      Emergency
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    if (activeReservation) cancelReservation(activeReservation.id)
                    closeDrawer()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading || !manifestId}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Already occupied/reserved */}
          {selectedSlot.status !== "AVAILABLE" && !activeReservation && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                This slot is currently {selectedSlot.status.toLowerCase()}.
                {selectedSlot.status === "OCCUPIED" && " Contact administrator to release."}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
