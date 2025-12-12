// CryoVault Backend Server
// Express + Socket.io + Prisma

import express from "express"
import { createServer } from "http"
import { Server as SocketServer } from "socket.io"
import cors from "cors"
import cron from "node-cron"

import prisma from "./lib/prisma"
import { holdRouter } from "./routes/hold"
import { bookRouter } from "./routes/book"
import { slotsRouter } from "./routes/slots"
import { ledgerRouter } from "./routes/ledger"
import { simulateRouter } from "./routes/simulate"
import { usersRouter } from "./routes/users"
import { cleanupExpiredReservations } from "./jobs/cleanup"

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL environment variable is not set")
  console.error("Please set DATABASE_URL in your .env file or environment")
  process.exit(1)
}

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log("✅ Database connection successful")
  } catch (error) {
    console.error("❌ Database connection failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  }

  const app = express()
  const httpServer = createServer(app)

  // Socket.io setup with CORS
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  })

  // Make io available to routes
  app.set("io", io)

  // Middleware
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    }),
  )
  app.use(express.json())

  // Health check
  app.get("/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
  })

  // API Routes
  app.use("/api/hold", holdRouter)
  app.use("/api/book", bookRouter)
  app.use("/api/slots", slotsRouter)
  app.use("/api/ledger", ledgerRouter)
  app.use("/api/simulate", simulateRouter)
  app.use("/api/users", usersRouter)

  // Socket.io connection handling
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Join the main room for updates
    socket.join("cryovault")

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  // Cron job: Clean up expired reservations every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const cleaned = await cleanupExpiredReservations(io)
      if (cleaned > 0) {
        console.log(`[CryoVault] Cleaned up ${cleaned} expired reservations`)
      }
    } catch (error) {
      // Log but don't crash - cleanup will retry next cycle
      console.error("[CryoVault] Cleanup job error:", error instanceof Error ? error.message : error)
    }
  })

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down...")
    await prisma.$disconnect()
    httpServer.close(() => {
      console.log("Server closed")
      process.exit(0)
    })
  })

  // Start server
  const PORT = process.env.PORT || 4000

  httpServer.listen(PORT, () => {
    console.log(`🚀 CryoVault server running on port ${PORT}`)
    console.log(`📡 Socket.io enabled`)
    console.log(`🔄 Cleanup job scheduled (every 30s)`)
  })

  return httpServer
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error)
  process.exit(1)
})

export { startServer }

export { io }
