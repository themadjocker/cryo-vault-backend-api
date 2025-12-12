"use client"

import { useCryo } from "@/lib/cryo-context"
import { currentUser } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Search, User, LogOut, Settings, Wifi, WifiOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function TopBar() {
  const { stats, connectionStatus } = useCryo()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search slots, manifests..."
            className="h-9 w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
            connectionStatus === "connected" && "bg-green-100 text-green-700",
            connectionStatus === "connecting" && "bg-yellow-100 text-yellow-700",
            connectionStatus === "disconnected" && "bg-slate-100 text-slate-600",
          )}
          title={
            connectionStatus === "connected"
              ? "Connected to backend server"
              : connectionStatus === "connecting"
                ? "Connecting to server..."
                : "Demo mode - backend unavailable"
          }
        >
          {connectionStatus === "connected" && <Wifi className="h-3.5 w-3.5" />}
          {connectionStatus === "connecting" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {connectionStatus === "disconnected" && <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">
            {connectionStatus === "connected" && "Live"}
            {connectionStatus === "connecting" && "Connecting"}
            {connectionStatus === "disconnected" && "Demo Mode"}
          </span>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {stats.pendingActions > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
              {stats.pendingActions}
            </span>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{currentUser.role.toLowerCase()}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
