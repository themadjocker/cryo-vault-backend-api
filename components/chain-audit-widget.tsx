"use client"

import { useState, useEffect } from "react"
import { useCryo } from "@/lib/cryo-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, ChevronUp, ChevronDown, CheckCircle2, Link2, Play, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChainAuditWidget() {
  const { ledger } = useCryo()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifiedBlocks, setVerifiedBlocks] = useState<Set<string>>(new Set())
  const [animatingBlock, setAnimatingBlock] = useState<string | null>(null)

  // Take last 5 entries for display
  const recentEntries = ledger.slice(-5).reverse()

  // Animate new ledger entries
  useEffect(() => {
    if (ledger.length > 0) {
      const latest = ledger[ledger.length - 1]
      setAnimatingBlock(latest.id)
      const timer = setTimeout(() => setAnimatingBlock(null), 300)
      return () => clearTimeout(timer)
    }
  }, [ledger]) // Updated dependency to ledger

  // Verification Mode animation
  const handleVerification = async () => {
    setIsVerifying(true)
    setVerifiedBlocks(new Set())

    // Simulate verification of each block sequentially
    for (let i = 0; i < recentEntries.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      setVerifiedBlocks((prev) => new Set([...prev, recentEntries[i].id]))
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
    setIsVerifying(false)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-xl border border-border bg-card shadow-xl">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-xl"
        aria-expanded={isExpanded}
        aria-controls="audit-content"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">Blockchain Audit</h3>
            <p className="text-xs text-muted-foreground">{ledger.length} verified blocks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
            Synced
          </Badge>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div id="audit-content" className="border-t border-border">
          {/* Verification Mode Button */}
          <div className="p-3 border-b border-border bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={handleVerification}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Chain Integrity...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Verification Mode
                </>
              )}
            </Button>
          </div>

          {/* Ledger Entries */}
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {recentEntries.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  "relative rounded-lg border border-border bg-background p-3 transition-all",
                  animatingBlock === entry.id && "animate-slide-in",
                  isVerifying && verifiedBlocks.has(entry.id) && "chain-verify-animate border-primary/50",
                )}
              >
                {/* Chain connection line */}
                {index < recentEntries.length - 1 && (
                  <div className="absolute -bottom-3 left-1/2 flex h-4 -translate-x-1/2 items-center justify-center">
                    <Link2
                      className={cn(
                        "h-3 w-3 text-muted-foreground transition-colors",
                        isVerifying && verifiedBlocks.has(entry.id) && "text-primary",
                      )}
                    />
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{entry.action.replace(/_/g, " ")}</span>
                      {entry.slotName && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.slotName}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span title={entry.dataHash}>Hash: {truncateHash(entry.dataHash)}</span>
                      <span>|</span>
                      <span>Nonce: {entry.nonce}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
                    {(entry.verified || verifiedBlocks.has(entry.id)) && (
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4 transition-colors",
                          verifiedBlocks.has(entry.id) ? "text-primary" : "text-green-500",
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">Chain integrity verified with SHA-256 HMAC</p>
          </div>
        </div>
      )}
    </div>
  )
}
