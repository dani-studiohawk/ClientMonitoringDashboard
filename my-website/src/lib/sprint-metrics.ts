// Shared sprint performance rules used by the Dashboard and Reports pages.
// Both pages analyse completed, fully tracked sprints only.

export interface SprintPerformanceInput {
  status: string | null
  tracking_status: string | null
  kpi_target: number
  kpi_achieved: number
  hours_used: number | null
  hours_allocated: number
  billable_rate: number | null
}

export type PerformanceBucket = 'metWithinHours' | 'metAboveHours' | 'missedWithinHours' | 'missedAboveHours'

/** Completed sprints with both KPI and hours data: the only ones fit for analysis. */
export function isAnalysable(sprint: Pick<SprintPerformanceInput, 'status' | 'tracking_status'>): boolean {
  return sprint.status === 'completed' && sprint.tracking_status === 'fully_tracked'
}

export function kpiMet(sprint: Pick<SprintPerformanceInput, 'kpi_target' | 'kpi_achieved'>): boolean {
  return sprint.kpi_target > 0 && sprint.kpi_achieved >= sprint.kpi_target
}

/**
 * KPI met/missed x within/over allocated hours. Sprints without a KPI target
 * or without allocated hours can't be judged and get null.
 */
export function performanceBucket(sprint: SprintPerformanceInput): PerformanceBucket | null {
  if (sprint.kpi_target <= 0 || sprint.hours_allocated <= 0) return null
  const withinHours = (sprint.hours_used ?? 0) <= sprint.hours_allocated
  if (kpiMet(sprint)) return withinHours ? 'metWithinHours' : 'metAboveHours'
  return withinHours ? 'missedWithinHours' : 'missedAboveHours'
}

export function groupByPerformance<T extends SprintPerformanceInput>(sprints: T[]): Record<PerformanceBucket, T[]> {
  const groups: Record<PerformanceBucket, T[]> = {
    metWithinHours: [],
    metAboveHours: [],
    missedWithinHours: [],
    missedAboveHours: [],
  }
  for (const sprint of sprints) {
    const bucket = performanceBucket(sprint)
    if (bucket) groups[bucket].push(sprint)
  }
  return groups
}

/** Simple mean of the sprints' billable rates; sprints with no rate are skipped. */
export function averageBillableRate(sprints: Pick<SprintPerformanceInput, 'billable_rate'>[]): number {
  const rates = sprints.map((s) => s.billable_rate).filter((r): r is number => r != null)
  return rates.length > 0 ? rates.reduce((sum, r) => sum + r, 0) / rates.length : 0
}

/** Share of sprints (with a KPI target) that hit it, as a percentage. */
export function kpiHitRate(sprints: Pick<SprintPerformanceInput, 'kpi_target' | 'kpi_achieved'>[]): number {
  const withTarget = sprints.filter((s) => s.kpi_target > 0)
  return withTarget.length > 0 ? (withTarget.filter(kpiMet).length / withTarget.length) * 100 : 0
}

/** Hours used as a percentage of hours allocated (0 when nothing is allocated). */
export function hoursUtilisation(used: number, allocated: number): number {
  return allocated > 0 ? (used / allocated) * 100 : 0
}
