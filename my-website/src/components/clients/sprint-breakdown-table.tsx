'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { normalizeHealth } from '@/lib/sprint-health'

interface Sprint {
  id: string
  sprint_number: number | null
  start_date: string
  end_date: string
  status: string | null
  health_status: string | null
  kpi_target: number
  kpi_achieved: number
  hours_used: number
  hours_allocated: number | null
  hours_utilization_percent: number | null
  billable_rate: number | null
  kpi_efficiency: number | null
  monthly_rate: number | null
}

interface SprintBreakdownTableProps {
  sprints: Sprint[]
}

export function SprintBreakdownTable({ sprints }: SprintBreakdownTableProps) {
  const router = useRouter()

  const getHealthBadge = (health: string | null) => {
    if (!health) return null

    const normalizedHealth = normalizeHealth(health) ?? health

    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      'completed': { label: 'Completed', variant: 'secondary' },
      'kpi-complete': { label: 'KPI Complete', variant: 'default', className: 'bg-blue-500' },
      'ahead': { label: 'Ahead', variant: 'default', className: 'bg-emerald-500' },
      'on-track': { label: 'On Track', variant: 'default', className: 'bg-green-500' },
      'needs-attention': { label: 'Needs Attention', variant: 'destructive', className: 'bg-orange-500' },
      'not-started': { label: 'Not Started', variant: 'outline' },
    }

    const badgeConfig = config[normalizedHealth] || { label: health, variant: 'outline' as const }

    return (
      <Badge variant={badgeConfig.variant} className={`text-xs ${badgeConfig.className || ''}`}>
        {badgeConfig.label}
      </Badge>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sprint</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Health</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">KPI Target</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">KPI Achieved</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Efficiency</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Hours Used</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Utilization</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
          </tr>
        </thead>
        <tbody>
          {sprints.map((sprint) => {
            // Use pre-calculated values from database (secure!)
            const efficiency = sprint.kpi_efficiency ?? 0
            const utilization = sprint.hours_utilization_percent ?? 0
            const rate = sprint.billable_rate ?? 0
            const budgetHours = sprint.hours_allocated ?? 0
            const isActive = sprint.status === 'active'

            return (
              <tr 
                key={sprint.id} 
                className={`border-b border-gray-100 hover:bg-gray-50 hover:shadow-md transition-shadow cursor-pointer ${isActive ? 'bg-blue-50' : ''}`}
                onClick={() => router.push(`/dashboard/sprints/${sprint.id}`)}
              >
                <td className="py-4 px-4">
                  <div className="font-semibold text-gray-900">Sprint {sprint.sprint_number ?? '–'}</div>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {format(new Date(sprint.start_date), 'dd MMM')} - {format(new Date(sprint.end_date), 'dd MMM yy')}
                </td>
                <td className="py-4 px-4">
                  {getHealthBadge(sprint.health_status)}
                </td>
                <td className="py-4 px-4 text-right text-gray-900">{sprint.kpi_target}</td>
                <td className="py-4 px-4 text-right font-semibold text-gray-900">{sprint.kpi_achieved}</td>
                <td className="py-4 px-4 text-right">
                  <span className={`font-semibold ${
                    efficiency >= 100 ? 'text-green-600' :
                    efficiency >= 50 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {efficiency.toFixed(0)}%
                  </span>
                </td>
                <td className="py-4 px-4 text-right text-gray-900">
                  {sprint.hours_used.toFixed(1)} <span className="text-gray-400">/ {budgetHours.toFixed(0)}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={`font-semibold ${
                    utilization > 100 ? 'text-red-600' :
                    utilization > 80 ? 'text-amber-600' :
                    'text-green-600'
                  }`}>
                    {utilization.toFixed(0)}%
                  </span>
                </td>
                <td className="py-4 px-4 text-right text-gray-900">
                  ${rate > 0 ? Math.round(rate) : '—'}/hr
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
