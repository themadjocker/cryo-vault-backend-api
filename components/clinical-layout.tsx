"use client"

import type React from "react"

import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { ChainAuditWidget } from "./chain-audit-widget"
import { SimulationControls } from "./simulation-controls"
import { ManifestDrawer } from "./manifest-drawer"
import { CryoProvider } from "@/lib/cryo-context"

interface ClinicalLayoutProps {
  children: React.ReactNode
}

export function ClinicalLayout({ children }: ClinicalLayoutProps) {
  return (
    <CryoProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="ml-64 transition-all duration-300">
          <TopBar />
          <main className="p-6">{children}</main>
        </div>
        <ManifestDrawer />
        <ChainAuditWidget />
        <SimulationControls />
      </div>
    </CryoProvider>
  )
}
