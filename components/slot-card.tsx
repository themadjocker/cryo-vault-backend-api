"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Slot } from "@/lib/types"

interface SlotCardProps {
  slot: Slot
  onClick: () => void
  heatmapEnabled: boolean
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Generate smooth cubic bezier path
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * 100,
    y: 100 - ((value - min) / range) * 80 - 10, // 10-90 range for padding
  }))

  // Create smooth curve using cubic bezier
  let path = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    const cpx1 = current.x + (next.x - current.x) / 3
    const cpx2 = current.x + (2 * (next.x - current.x)) / 3
    path += ` C ${cpx1},${current.y} ${cpx2},${next.y} ${next.x},${next.y}`
  }

  return (
    <svg viewBox="0 0 100 100" className="h-10 w-full" preserveAspectRatio="none">
      <path
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d={path}
        className="sparkline-animate"
      />
    </svg>
  )
}

// Temperature to heatmap color
function getTempColor(temp: number): string {
  const normalized = Math.max(0, Math.min(1, (temp + 80) / 20))
  if (normalized < 0.3) return "bg-blue-500"
  if (normalized < 0.5) return "bg-cyan-500"
  if (normalized < 0.7) return "bg-yellow-500"
  if (normalized < 0.85) return "bg-orange-500"
  return "bg-red-500"
}

export function SlotCard({ slot, onClick, heatmapEnabled }: SlotCardProps) {
  const statusConfig = useMemo(() => {
    switch (slot.status) {
      case "AVAILABLE":
        return { label: "Available", className: "bg-teal-700 text-white" }
      case "RESERVED":
        return { label: "Reserved", className: "bg-orange-500 text-white" }
      case "OCCUPIED":
        return { label: "Occupied", className: "bg-slate-400 text-white" }
    }
  }, [slot.status])

  const tempStatusConfig = useMemo(() => {
    switch (slot.tempStatus) {
      case "NORMAL":
        return { color: "#06b6d4", ledClass: "bg-green-500" }
      case "WARNING":
        return { color: "#fb923c", ledClass: "bg-orange-500" }
      case "CRITICAL":
        return { color: "#ef4444", ledClass: "bg-red-500" }
    }
  }, [slot.tempStatus])

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all bg-white border border-slate-200",
        "hover:shadow-md hover:border-teal-200 hover:-translate-y-0.5",
        "group",
        slot.status === "AVAILABLE" && "hover:border-teal-400",
        slot.status === "RESERVED" && "border-orange-200",
        slot.tempStatus === "CRITICAL" && "border-red-300 animate-pulse",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Freezer slot ${slot.name}, ${slot.status.toLowerCase()}, temperature ${slot.temperature} degrees Celsius`}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">{slot.name}</h3>
            {/* Status LED */}
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                tempStatusConfig.ledClass,
                slot.tempStatus !== "NORMAL" && "led-pulse",
              )}
              aria-label={`Temperature status: ${slot.tempStatus.toLowerCase()}`}
            />
          </div>
          <Badge className={statusConfig.className} variant="secondary">
            {statusConfig.label}
          </Badge>
        </div>

        {/* LCD Temperature Display */}
        <div
          className={cn(
            "lcd-display rounded-lg p-3 mb-3 transition-colors",
            heatmapEnabled && getTempColor(slot.temperature),
          )}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-cryo-lcd-text">{slot.temperature.toFixed(1)}°C</span>
            <span className="text-xs text-cryo-lcd-text/60 font-mono">Target: {slot.targetTemp}°C</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="mb-3">
          <Sparkline data={slot.sparklineData} color={tempStatusConfig.color} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Last check: {new Date(slot.lastMaintenance).toLocaleDateString()}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-teal-700 font-medium">
            Click to manage
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
