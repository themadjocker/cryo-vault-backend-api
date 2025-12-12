"use client"

import { useCryo } from "@/lib/cryo-context"
import { SlotCard } from "./slot-card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Thermometer, Grid3X3 } from "lucide-react"

export function FreezerGrid() {
  const { slots, openDrawer, heatmapEnabled, toggleHeatmap } = useCryo()

  return (
    <div className="space-y-4">
      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Storage Units</h2>
        </div>

        {/* Heatmap Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="heatmap-toggle" className="text-sm text-muted-foreground">
              Thermal Heatmap
            </Label>
          </div>
          <Switch
            id="heatmap-toggle"
            checked={heatmapEnabled}
            onCheckedChange={toggleHeatmap}
            aria-label="Toggle thermal heatmap view"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((slot) => (
          <SlotCard key={slot.id} slot={slot} onClick={() => openDrawer(slot)} heatmapEnabled={heatmapEnabled} />
        ))}
      </div>
    </div>
  )
}
