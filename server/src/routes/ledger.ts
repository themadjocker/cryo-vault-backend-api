// GET /api/ledger - Retrieve last 10 ledger entries

import { Router } from "express"
import { getRecentLedgerEntries, verifyChainIntegrity } from "../lib/ledger-service"

export const ledgerRouter = Router()

// GET /api/ledger - Get recent entries
ledgerRouter.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit as string) || 10, 50)
    const entries = await getRecentLedgerEntries(limit)

    res.json({
      success: true,
      entries,
      count: entries.length,
    })
  } catch (error) {
    console.error("Ledger fetch error:", error)
    res.status(500).json({
      success: false,
      error: "FETCH_ERROR",
    })
  }
})

// GET /api/ledger/verify - Verify chain integrity
ledgerRouter.get("/verify", async (_, res) => {
  try {
    const result = await verifyChainIntegrity()

    res.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Ledger verify error:", error)
    res.status(500).json({
      success: false,
      error: "VERIFY_ERROR",
    })
  }
})
