'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, Target, Clock, TrendingUp, ClipboardX } from 'lucide-react'
import type { ClientWithDprLead } from '@/types'
import { format, differenceInDays } from 'date-fns'
import { getSprintHealth } from '@/lib/sprint-health'
import { getHealthDisplay, type HealthDisplay } from '@/components/sprints/health-display'

interface ClientCardProps {
  client: ClientWithDprLead
}

const regionColors: Record<string, string> = {
  AU: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  US: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  UK: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
}

const statusColors: Record<string, string> = {
  'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'paused': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'refunded': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function ClientCard({ client }: ClientCardProps) {
  // Determine status based on group_name or is_active
  const getStatus = () => {
    if (!client.is_active) return 'inactive'
    if (client.group_name?.includes('Paused')) return 'paused'
    if (client.group_name?.includes('Completed')) return 'completed'
    if (client.group_name?.includes('Refunded')) return 'refunded'
    return 'active'
  }

  const status = getStatus()
  const statusColor = statusColors[status] || statusColors['active']
  const regionColor = regionColors[client.region || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'

  // Get current active sprint
  const currentSprint = client.sprints?.find(s => s.status === 'active')
  
  // Sprint calculations (if sprint exists)
  let sprintData: {
    health: string | null
    healthInfo: HealthDisplay | null
    kpiProgress: number
    hoursProgress: number
    hoursUsed: number
    budgetHours: number
    daysRemaining: number
  } | null = null

  if (currentSprint) {
    const today = new Date()
    const endDate = new Date(currentSprint.end_date)
    
    const health = getSprintHealth(currentSprint)
    const healthInfo = getHealthDisplay(health)
    
    const kpiProgress = currentSprint.kpi_target > 0 
      ? ((currentSprint.kpi_achieved ?? 0) / currentSprint.kpi_target) * 100 
      : 0
    
    const daysRemaining = Math.max(0, differenceInDays(endDate, today))
    
    // Calculate hours (sprint is 3 months, so monthly_hours * 3)
    const budgetHours = (client.monthly_hours || 0) * 3
    const hoursUsed = currentSprint.hours_used || 0
    const hoursProgress = budgetHours > 0 
      ? (hoursUsed / budgetHours) * 100 
      : 0

    sprintData = {
      health,
      healthInfo,
      kpiProgress,
      hoursProgress,
      hoursUsed,
      budgetHours,
      daysRemaining
    }
  }

  return (
    <Link href={`/dashboard/clients/${client.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {client.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {client.dpr_lead?.name || 'Unassigned'}
                {currentSprint && (
                  <span className="ml-2">• Sprint #{currentSprint.sprint_number || '?'}</span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge className={regionColor}>
                {client.region || 'N/A'}
              </Badge>
              {status !== 'active' && (
                <Badge className={statusColor}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              )}
              {client.has_incomplete_tracking && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" title="Has active sprints with incomplete tracking">
                  <ClipboardX className="h-3 w-3 mr-1" />
                  Needs Data
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Sprint Section */}
          {currentSprint && sprintData && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Current Sprint</span>
                </div>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  {format(new Date(currentSprint.start_date), 'MMM d')} - {format(new Date(currentSprint.end_date), 'MMM d')}
                </span>
              </div>

              {/* KPI Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-blue-800 dark:text-blue-300">
                    <Target className="h-3 w-3" />
                    KPI Progress
                  </span>
                  <span className="font-semibold text-blue-900 dark:text-blue-200">
                    {currentSprint.kpi_achieved}/{currentSprint.kpi_target} ({Math.round(sprintData.kpiProgress)}%)
                  </span>
                </div>
                <Progress 
                  value={Math.min(sprintData.kpiProgress, 100)} 
                  className="h-1.5"
                />
              </div>

              {/* Hours Used */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-blue-800 dark:text-blue-300">
                    <Clock className="h-3 w-3" />
                    Hours Used
                  </span>
                  <span className="font-semibold text-blue-900 dark:text-blue-200">
                    {sprintData.hoursUsed.toFixed(1)}/{sprintData.budgetHours.toFixed(1)} hrs ({Math.round(sprintData.hoursProgress)}%)
                  </span>
                </div>
                <Progress 
                  value={Math.min(sprintData.hoursProgress, 100)} 
                  className={`h-1.5 ${sprintData.hoursProgress > 100 ? '[&>div]:bg-red-500' : ''}`}
                />
              </div>
            </div>
          )}

          {/* KPI & Hours To Date Section */}
          {((client.total_link_kpi ?? 0) > 0 || (client.total_links_achieved ?? 0) > 0 || (client.total_hours_used ?? 0) > 0) && (
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-gray-200">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Contract To Date
                </span>
              </div>

              {/* Total Links */}
              {((client.total_link_kpi ?? 0) > 0 || (client.total_links_achieved ?? 0) > 0) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Target className="h-3 w-3" />
                      Total Links
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {client.total_links_achieved || 0}/{client.total_link_kpi || 0}
                    </span>
                  </div>
                  <Progress 
                    value={(client.total_link_kpi ?? 0) > 0 ? Math.min(((client.total_links_achieved ?? 0) / (client.total_link_kpi ?? 1)) * 100, 100) : 0} 
                    className="h-1.5"
                  />
                </div>
              )}

              {/* Total Hours */}
              {((client.total_hours_used ?? 0) > 0 || (client.total_hours_allocated ?? 0) > 0) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Clock className="h-3 w-3" />
                      Total Hours
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {(client.total_hours_used || 0).toFixed(1)}/{(client.total_hours_allocated || 0).toFixed(1)} hrs
                    </span>
                  </div>
                  <Progress 
                    value={(client.total_hours_allocated ?? 0) > 0 ? Math.min(((client.total_hours_used ?? 0) / (client.total_hours_allocated ?? 1)) * 100, 100) : 0} 
                    className={`h-1.5 ${(client.total_hours_allocated ?? 0) > 0 && (client.total_hours_used ?? 0) / (client.total_hours_allocated ?? 1) > 1 ? '[&>div]:bg-red-500' : ''}`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Client Details */}
          <div className="pt-3 border-t space-y-2">
            {/* Agency Value */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Agency Value
              </span>
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {client.agency_value 
                  ? `$${client.agency_value.toLocaleString()}`
                  : '-'
                }
              </span>
            </div>

            {/* Monthly Rate */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Monthly Rate
              </span>
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {client.monthly_rate 
                  ? `$${client.monthly_rate.toLocaleString()}`
                  : '-'
                }
              </span>
            </div>

            {/* Contract Type */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Contract Type
              </span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {client.campaign_type || '-'}
              </span>
            </div>

            {/* Contract Length */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Contract Length
              </span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {client.contract_length || '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ClientCardGrid({ clients }: { clients: ClientWithDprLead[] }) {
  if (clients.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-500">
        No clients found
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  )
}
