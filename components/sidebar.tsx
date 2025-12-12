"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useCryo } from "@/lib/cryo-context"
import { LayoutDashboard, Thermometer, Package, History, Settings, ChevronLeft, Snowflake, Shield } from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "#", active: true },
  { icon: Thermometer, label: "Temperature", href: "#" },
  { icon: Package, label: "Inventory", href: "#" },
  { icon: History, label: "Audit Log", href: "#" },
  { icon: Settings, label: "Settings", href: "#" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { connectionStatus } = useCryo()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Snowflake className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">CryoVault</span>
              <span className="text-xs text-sidebar-foreground/60">Cold Chain Manager</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 hover:bg-sidebar-accent transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Connection Status */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2", collapsed ? "justify-center" : "")}>
          <div className="relative">
            <Shield className="h-5 w-5 text-sidebar-foreground/70" />
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500",
              )}
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-medium capitalize">{connectionStatus}</span>
              <span className="text-xs text-sidebar-foreground/50">Blockchain Sync</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
