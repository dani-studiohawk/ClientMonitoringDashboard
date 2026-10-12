import { User } from 'lucide-react'
import { LegacySprintsSection } from '@/components/reports/legacy-sprints-section'
import type { DprDashboardModel } from '@/lib/dashboard/dpr-dashboard'
import { ActiveSprintsTable } from './active-sprints-table'
import { ClientsTable } from './clients-table'
import { CompletedSprintsSection } from './completed-sprints-section'
import { OverviewStats } from './overview-stats'

interface DprDashboardProps {
  leadName: string
  model: DprDashboardModel
}

/** A DPR lead's performance dashboard (shown to the lead, and to admins via ?dpr=). */
export function DprDashboard({ leadName, model }: DprDashboardProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <User className="h-7 w-7 text-gray-600 dark:text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {leadName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Performance Dashboard
            </p>
          </div>
        </div>
      </div>

      <OverviewStats
        activeClientCount={model.activeClients.length}
        activeSprintCount={model.activeSprints.length}
        avgBillableRate={model.avgBillableRate}
        healthCounts={model.healthCounts}
      />

      <ActiveSprintsTable sprints={model.activeSprints} />

      <ClientsTable activeClients={model.activeClients} inactiveClients={model.inactiveClients} />

      <CompletedSprintsSection
        sprints={model.completedSprints}
        performance={model.performance}
        sprintsByNiche={model.sprintsByNiche}
      />

      {model.legacySprints.length > 0 && (
        <LegacySprintsSection sprints={model.legacySprints} />
      )}
    </div>
  )
}
