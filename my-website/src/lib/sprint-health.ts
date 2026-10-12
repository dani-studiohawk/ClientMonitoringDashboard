import { differenceInDays } from 'date-fns'

// Single source of truth for sprint health in the UI.
//
// The stored sprints.health_status (written by the calculate-all-metrics edge
// function, see supabase/functions/calculate-all-metrics/sprint-calculator.ts)
// is preferred; calculateSprintHealth() is only a fallback for rows the
// function hasn't processed yet. Keep the two rule sets in sync.

export type SprintHealth =
  | 'not-started'
  | 'on-track'
  | 'ahead'
  | 'needs-attention'
  | 'kpi-complete'
  | 'completed'

export const HEALTH_LABELS: Record<SprintHealth, string> = {
  'not-started': 'Not Started',
  'on-track': 'On Track',
  'ahead': 'Ahead',
  'needs-attention': 'Needs Attention',
  'kpi-complete': 'KPI Complete',
  'completed': 'Completed',
}

export const HEALTH_COLORS: Record<SprintHealth, string> = {
  'not-started': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'on-track': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'ahead': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'needs-attention': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'kpi-complete': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

/** Sort order for sprint lists: most urgent first. */
export const HEALTH_PRIORITY: Record<SprintHealth, number> = {
  'needs-attention': 1,
  'on-track': 2,
  'ahead': 3,
  'kpi-complete': 4,
  'not-started': 5,
  'completed': 6,
}

const KNOWN = new Set<string>(Object.keys(HEALTH_LABELS))

/** Maps stored/legacy values onto the current set ('at-risk'/'behind' were merged). */
export function normalizeHealth(value: string | null | undefined): SprintHealth | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/\s+/g, '-')
  if (v === 'at-risk' || v === 'behind') return 'needs-attention'
  return KNOWN.has(v) ? (v as SprintHealth) : null
}

interface SprintForHealthCalc {
  status: string | null
  kpi_achieved: number | null
  kpi_target: number | null
  start_date: string
  end_date: string
  health_status?: string | null
}

export function calculateSprintHealth(sprint: SprintForHealthCalc, today = new Date()): SprintHealth | null {
  const startDate = new Date(sprint.start_date)
  const endDate = new Date(sprint.end_date)

  const kpiTarget = sprint.kpi_target ?? 0
  const kpiAchieved = sprint.kpi_achieved ?? 0

  if (endDate < today || sprint.status === 'completed') return 'completed'
  if (startDate > today) return 'not-started'
  if (kpiTarget === 0) return 'on-track'
  if (kpiAchieved >= kpiTarget) return 'kpi-complete'

  const totalDays = Math.max(1, differenceInDays(endDate, startDate))
  const daysElapsed = differenceInDays(today, startDate)
  const timeProgress = Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100))
  const kpiProgress = (kpiAchieved / kpiTarget) * 100

  if (timeProgress >= 80 && kpiProgress < 60) return 'needs-attention'
  if (timeProgress >= 60 && kpiProgress < 40) return 'needs-attention'
  if (timeProgress >= 40 && kpiProgress < 20) return 'needs-attention'
  if (timeProgress > kpiProgress + 15) return 'needs-attention'
  if (kpiProgress > timeProgress + 10) return 'ahead'

  return 'on-track'
}

/** Health to display: not-started always wins, then the stored value, then the fallback. */
export function getSprintHealth(sprint: SprintForHealthCalc, today = new Date()): SprintHealth | null {
  if (sprint.status !== 'completed' && new Date(sprint.start_date) > today) return 'not-started'
  return normalizeHealth(sprint.health_status) ?? calculateSprintHealth(sprint, today)
}

/**
 * kpi_achieved / hours_allocated are nullable columns but are always filled in
 * practice; default them to 0 once, right after a query, so the maths below
 * doesn't need a null check at every use.
 */
export function withSprintDefaults<T extends { kpi_achieved: number | null; hours_allocated: number | null }>(
  rows: T[] | null
): (Omit<T, 'kpi_achieved' | 'hours_allocated'> & { kpi_achieved: number; hours_allocated: number })[] {
  return (rows ?? []).map((row) => ({
    ...row,
    kpi_achieved: row.kpi_achieved ?? 0,
    hours_allocated: row.hours_allocated ?? 0,
  }))
}
