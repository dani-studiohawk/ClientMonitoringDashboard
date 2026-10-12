import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getHealthDisplay } from '@/components/sprints/health-display'
import type { SprintHealth } from '@/lib/sprint-health'

interface OverviewStatsProps {
  activeClientCount: number
  activeSprintCount: number
  avgBillableRate: number
  healthCounts: Partial<Record<SprintHealth, number>>
}

export function OverviewStats({ activeClientCount, activeSprintCount, avgBillableRate, healthCounts }: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-around gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Clients</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeClientCount}</div>
            </div>
            <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Sprints</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeSprintCount}</div>
            </div>
            <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Billable Rate</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">${avgBillableRate.toFixed(0)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">per hour</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Sprint Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(healthCounts).map(([health, count]) => {
              const config = getHealthDisplay(health as SprintHealth)!
              return (
                <Badge key={health} variant="outline" className={`${config.color} text-xs`}>
                  {count} {config.label}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
