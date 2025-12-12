import { ClinicalLayout } from "@/components/clinical-layout"
import { StatsOverview } from "@/components/stats-overview"
import { FreezerGrid } from "@/components/freezer-grid"

export default function DashboardPage() {
  return (
    <ClinicalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cold Chain Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage vaccine storage units in real-time.</p>
        </div>

        {/* Stats Cards */}
        <StatsOverview />

        {/* Freezer Grid */}
        <FreezerGrid />
      </div>
    </ClinicalLayout>
  )
}
