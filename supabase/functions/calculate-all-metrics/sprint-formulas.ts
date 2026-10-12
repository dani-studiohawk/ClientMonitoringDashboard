// Pure sprint metric formulas (no database access), shared by
// sprint-calculator.ts and covered by my-website/src/lib/sprint-formulas.test.ts.

import { calculateTrackingStatus } from './tracking-calculator.ts'

export interface SprintData {
  id: string
  client_id: string
  start_date: string
  end_date: string
  kpi_target: number
  kpi_achieved: number
  monthly_rate: number | null
  status: string
  clients: {
    monthly_hours: number | null
    monthly_rate: number | null
    is_quarterly_rate: boolean | null
  }
}


/**
 * Calculate sprint health status based on time/KPI/hours progress
 * Statuses: not-started, on-track, ahead, needs-attention, kpi-complete, completed
 * (at-risk + behind were merged into needs-attention). Keep in sync with
 * my-website/src/lib/sprint-health.ts
 */
export function calculateSprintHealth(
  timeProgress: number,
  kpiProgress: number,
  hoursProgress: number,
  status: string,
  kpiAchieved: number,
  kpiTarget: number,
  startDate: string,
  endDate: string,
  today = new Date()
): string {
  // If sprint end date has passed, mark as completed
  const sprintEndDate = new Date(endDate)
  if (sprintEndDate < today) {
    return 'completed'
  }

  // If sprint is manually marked as completed
  if (status === 'completed') return 'completed'

  // Sprint hasn't started yet: too early to judge progress
  if (new Date(startDate) > today) return 'not-started'

  // If no KPI target is set, default to on-track
  if (kpiTarget === 0) return 'on-track'

  // If KPI is already met
  if (kpiAchieved >= kpiTarget && kpiTarget > 0) {
    return 'kpi-complete'
  }

  // Needs Attention: Any concerning time/KPI/hours mismatch
  // Late stage with poor KPI
  if (timeProgress >= 80 && kpiProgress < 60) return 'needs-attention'
  if (timeProgress >= 60 && kpiProgress < 40) return 'needs-attention'
  if (timeProgress >= 40 && kpiProgress < 20) return 'needs-attention'

  // Time/hours significantly ahead of KPI progress
  if (timeProgress > kpiProgress + 15) return 'needs-attention'
  if (hoursProgress > kpiProgress + 20) return 'needs-attention'

  // Ahead: KPI progress ahead of timeline
  if (kpiProgress > timeProgress + 10) return 'ahead'

  // Default: On Track
  return 'on-track'
}

/**
 * Calculate metrics for a single sprint
 */
export function calculateMetricsForSprint(sprint: SprintData, hoursUsed: number, today = new Date()) {
  const startDate = new Date(sprint.start_date)
  const endDate = new Date(sprint.end_date)

  // Time metrics
  const totalDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const daysRemaining = Math.max(0, Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  const timeElapsedPercent = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100))

  // KPI metrics
  const kpiProgressPercent = sprint.kpi_target > 0 ? (sprint.kpi_achieved / sprint.kpi_target) * 100 : 0
  const kpiEfficiency = kpiProgressPercent // Same value

  // Hours metrics
  const monthlyHours = sprint.clients?.monthly_hours || 0
  const hoursAllocated = monthlyHours * 3 // Quarterly sprint = 3 months
  const hoursUtilizationPercent = hoursAllocated > 0 ? (hoursUsed / hoursAllocated) * 100 : 0

  // Financial metrics (SENSITIVE - only stored in DB, never exposed to client)
  // Use sprint monthly_rate if set, otherwise fall back to client monthly_rate
  const clientMonthlyRate = sprint.clients?.monthly_rate || 0
  const monthlyRate = sprint.monthly_rate || clientMonthlyRate
  // Check if this client's rate is actually quarterly (edge case: MoneyMe II)
  const isQuarterlyRate = sprint.clients?.is_quarterly_rate || false
  // If rate is already quarterly, use it directly; otherwise multiply by 3 for quarterly revenue
  const sprintRevenue = isQuarterlyRate ? monthlyRate : monthlyRate * 3
  const billableRate = hoursUsed > 0 && sprintRevenue > 0 ? sprintRevenue / hoursUsed : null

  // Health status
  const healthStatus = calculateSprintHealth(
    timeElapsedPercent,
    kpiProgressPercent,
    hoursUtilizationPercent,
    sprint.status,
    sprint.kpi_achieved,
    sprint.kpi_target,
    sprint.start_date,
    sprint.end_date,
    today
  )

  // Tracking status
  const trackingStatus = calculateTrackingStatus({
    start_date: sprint.start_date,
    end_date: sprint.end_date,
    status: sprint.status,
    kpi_target: sprint.kpi_target,
    kpi_achieved: sprint.kpi_achieved,
    hours_used: hoursUsed,
  })

  return {
    hours_used: hoursUsed,
    hours_allocated: hoursAllocated,
    hours_utilization_percent: Math.round(hoursUtilizationPercent * 10) / 10, // 1 decimal
    billable_rate: billableRate ? Math.round(billableRate * 100) / 100 : null, // 2 decimals
    sprint_revenue: sprintRevenue,
    kpi_progress_percent: Math.round(kpiProgressPercent * 10) / 10,
    kpi_efficiency: Math.round(kpiEfficiency * 10) / 10,
    time_elapsed_percent: Math.round(timeElapsedPercent * 10) / 10,
    days_remaining: daysRemaining,
    health_status: healthStatus,
    tracking_status: trackingStatus,
    metrics_last_calculated_at: new Date().toISOString(),
  }
}
