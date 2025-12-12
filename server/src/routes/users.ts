// GET /api/users - Get list of users

import { Router } from "express"
import prisma from "../lib/prisma"

export const usersRouter = Router()

usersRouter.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    res.json({ users })
  } catch (error) {
    console.error("Users fetch error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    })
  }
})

// GET /api/users/first - Get first user (for current user)
usersRouter.get("/first", async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No users found",
      })
    }

    res.json({ user })
  } catch (error) {
    console.error("User fetch error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
    })
  }
})
