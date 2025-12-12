"use client"

import type React from "react"
import { useCryo } from "@/lib/cryo-context"
import { Boxes, Thermometer, Clock, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "warning" | "success"
}

function StatCard({ title, value, subtitle, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md",
        variant === "warning" && "border-l-4 border-l-orange-500",
        variant === "success" && "border-l-4 border-l-teal-600",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            variant === "default" && "bg-slate-100 text-slate-600",
            variant === "warning" && "bg-orange-100 text-orange-600",
            variant === "success" && "bg-teal-100 text-teal-700",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

export function StatsOverview() {
  const { stats } = useCryo()

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Available Slots"
        value={`${stats.availableSlots}/${stats.totalSlots}`}
        subtitle="Ready for allocation"
        icon={Boxes}
        variant="success"
      />
      <StatCard
        title="Avg Temperature"
        value={`${stats.avgTemperature}°C`}
        subtitle="Across all units"
        icon={Thermometer}
        variant={stats.avgTemperature > -68 ? "warning" : "default"}
      />
      <StatCard
        title="Pending Actions"
        value={stats.pendingActions}
        subtitle="Reservations to confirm"
        icon={Clock}
        variant={stats.pendingActions > 3 ? "warning" : "default"}
      />
      <StatCard title="Verified Blocks" value={stats.verifiedBlocks} subtitle="Blockchain integrity" icon={Shield} />
    </div>
  )
}
