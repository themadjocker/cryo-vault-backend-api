"use client"

import { useState } from "react"
import { useCryo } from "@/lib/cryo-context"
import { Button } from "@/components/ui/button"
import { Zap, AlertTriangle, ChevronRight, TestTube2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function SimulationControls() {
  const { simulateTraffic, simulateFailure } = useCryo()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleTraffic = () => {
    simulateTraffic()
    toast.info("Traffic simulation", { description: "Slot statuses randomized." })
  }

  const handleFailure = () => {
    simulateFailure()
    toast.warning("Failure simulation", { description: "A slot has entered critical state." })
  }

  return (
    <div className={cn("fixed left-20 bottom-4 z-50 transition-all duration-300", isExpanded ? "w-auto" : "w-12")}>
      <div className="flex items-center gap-2 rounded-full border border-border bg-card shadow-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Collapse simulation controls" : "Expand simulation controls"}
        >
          <TestTube2 className="h-5 w-5" />
          <ChevronRight
            className={cn("h-3 w-3 absolute -right-0.5 transition-transform", isExpanded && "rotate-180")}
          />
        </Button>

        {isExpanded && (
          <div className="flex items-center gap-2 pr-2 animate-slide-in">
            <Button variant="outline" size="sm" onClick={handleTraffic} className="gap-2 bg-transparent">
              <Zap className="h-4 w-4" />
              Simulate Traffic
            </Button>
            <Button variant="destructive" size="sm" onClick={handleFailure} className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Simulate Failure
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
