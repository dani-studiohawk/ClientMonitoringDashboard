'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { format, differenceInDays } from 'date-fns'
import { Calendar, Clock, Target } from 'lucide-react'
import { getSprintHealth } from '@/lib/sprint-health'
import { getHealthDisplay } from './health-display'
import { TrackingStatusBadge } from './tracking-status-badge'
import type { TrackingStatus } from '@/types/database'

export interface SprintWithCalculations {
  id: string
  name: string
  sprint_number: number | null
  start_date: string
  end_date: string
  kpi_target: number
  kpi_achieved: number
  monthly_rate: number | null
  status: 'active' | 'completed' | 'cancelled' | 'pending'
  health_status: string | null
  tracking_status?: TrackingStatus | null
  billable_rate: number | null
  client_id: string
  clients: {
    id: string
    name: string
    monthly_hours: number | null
    report_status?: string | null
    dpr_lead_id?: string | null
    dpr_lead?: {
      id: string
      name: string
    } | null
  } | null
  hours_used: number
}

interface SprintCardProps {
  sprint: SprintWithCalculations
}

export function SprintCard({ sprint }: SprintCardProps) {
  // Use pre-calculated health status from database, fallback to calculation if null
  const healthInfo = getHealthDisplay(getSprintHealth(sprint))
  
  const today = new Date()
  const startDate = new Date(sprint.start_date)
  const endDate = new Date(sprint.end_date)
  
  // Calculate KPI progress
  const kpiProgress = sprint.kpi_target > 0 
    ? (sprint.kpi_achieved / sprint.kpi_target) * 100 
    : 0
  
  // Calculate days remaining
  const totalDays = differenceInDays(endDate, startDate)
  const daysRemaining = Math.max(0, differenceInDays(endDate, today))
  const daysProgress = totalDays > 0 
    ? ((totalDays - daysRemaining) / totalDays) * 100 
    : 100
  
  // KPI color logic for active sprints: consider time progress
  // If sprint is early (< 50% time elapsed), be more lenient with KPI
  const getKpiColor = () => {
    if (sprint.status === 'completed') {
      // Completed sprints: strict evaluation
      if (kpiProgress >= 100) return 'text-green-600 dark:text-green-400'
      if (kpiProgress >= 80) return 'text-amber-600 dark:text-amber-400'
      return 'text-red-600 dark:text-red-400'
    }
    
    // Active sprints: time-aware evaluation
    if (kpiProgress >= 100) return 'text-green-600 dark:text-green-400'
    
    // Early in sprint (< 50% time): green if on pace or ahead
    if (daysProgress < 50) {
      if (kpiProgress >= daysProgress - 10) return 'text-green-600 dark:text-green-400'
      if (kpiProgress >= daysProgress - 25) return 'text-amber-600 dark:text-amber-400'
      return 'text-red-600 dark:text-red-400'
    }
    
    // Mid to late sprint (≥ 50% time): stricter evaluation
    if (kpiProgress >= 80) return 'text-green-600 dark:text-green-400'
    if (kpiProgress >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }
  
  const getKpiBarColor = () => {
    if (sprint.status === 'completed') {
      if (kpiProgress >= 100) return '[&>div]:bg-green-500'
      if (kpiProgress >= 80) return '[&>div]:bg-amber-500'
      return '[&>div]:bg-red-500'
    }
    
    // Active sprints
    if (kpiProgress >= 100) return '[&>div]:bg-green-500'
    
    if (daysProgress < 50) {
      if (kpiProgress >= daysProgress - 10) return '[&>div]:bg-green-500'
      if (kpiProgress >= daysProgress - 25) return '[&>div]:bg-amber-500'
      return '[&>div]:bg-red-500'
    }
    
    if (kpiProgress >= 80) return '[&>div]:bg-green-500'
    if (kpiProgress >= 60) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-red-500'
  }
  
  // Calculate hours (sprint is 3 months, so monthly_hours * 3)
  const budgetHours = (sprint.clients?.monthly_hours || 0) * 3
  const hoursProgress = budgetHours > 0 
    ? (sprint.hours_used / budgetHours) * 100 
    : 0

  return (
    <Link href={`/dashboard/sprints/${sprint.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {sprint.clients?.name || 'Unknown Client'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sprint #{sprint.sprint_number || '?'}
                {sprint.clients?.dpr_lead?.name && (
                  <span className="ml-2 text-gray-400">• {sprint.clients.dpr_lead.name}</span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {healthInfo && (
                <Badge className={`${healthInfo.color} flex items-center gap-1`}>
                  {healthInfo.icon}
                  {healthInfo.label}
                </Badge>
              )}
              <TrackingStatusBadge status={sprint.tracking_status} showIcon={true} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dates */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>

          {/* KPI Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Target className="h-4 w-4" />
                KPI Progress
              </span>
              <span className={`font-medium ${getKpiColor()}`}>
                {sprint.kpi_achieved}/{sprint.kpi_target} ({Math.round(kpiProgress)}%)
              </span>
            </div>
            <Progress 
              value={Math.min(kpiProgress, 100)} 
              className={`h-2 ${getKpiBarColor()}`}
            />
          </div>

          {/* Hours Used */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                Hours Used
              </span>
              <span className={`font-medium ${
                hoursProgress <= 100 ? 'text-green-600 dark:text-green-400' :
                hoursProgress <= 110 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {sprint.hours_used.toFixed(1)}/{budgetHours.toFixed(1)} hrs ({Math.round(hoursProgress)}%)
              </span>
            </div>
            <Progress 
              value={Math.min(hoursProgress, 100)} 
              className={`h-2 ${
                hoursProgress <= 100 ? '[&>div]:bg-green-500' :
                hoursProgress <= 110 ? '[&>div]:bg-amber-500' :
                '[&>div]:bg-red-500'
              }`}
            />
          </div>

          {/* Days Remaining */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Days Remaining</span>
              <span className="font-medium">
                {daysRemaining} of {totalDays} days
              </span>
            </div>
            <Progress 
              value={daysProgress} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function SprintCardGrid({ sprints }: { sprints: SprintWithCalculations[] }) {
  if (sprints.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-500">
        No sprints found
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sprints.map((sprint) => (
        <SprintCard key={sprint.id} sprint={sprint} />
      ))}
    </div>
  )
}
