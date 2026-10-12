// Tracking Status Calculator
// Purpose: Calculate tracking_status for sprints and has_incomplete_tracking for clients
// Called by: sprint-calculator.ts and client-calculator.ts
// Date: 2025-12-16
// Author: Claude Code

/**
 * Calculate tracking status for a single sprint
 *
 * Logic:
 * 1. Future sprints (start_date > today) → 'pending'
 * 2. Completed before Clockify + no data → 'legacy' (end_date < Feb 1, 2025)
 * 3. Started before Clockify → 'partial' (start_date < Feb 1, 2025)
 * 4. Has KPI tracking (target set) + (active/pending OR has hours) → 'fully_tracked'
 * 5. Completed with KPI tracking but no hours logged → 'kpi_only'
 * 6. Has hours but no KPI tracking → 'hours_only'
 * 7. Neither → 'untracked'
 *
 * Edge cases:
 * - NULL values treated as 0
 * - KPI target of 0 = no KPI tracking
 * - Hours used of 0 or NULL = no hours logged YET (may still be fully_tracked if active)
 * - Active sprints with KPI target are 'fully_tracked' even with 0 hours (work just started)
 * - Future sprints should NEVER be 'legacy', always 'pending'
 * - Sprints that started before Feb 1, 2025 are 'partial' (incomplete hour tracking)
 */
export function calculateTrackingStatus(sprint: {
  start_date: string
  end_date: string
  status: string
  kpi_target: number
  kpi_achieved?: number
  hours_used: number | null
}): string {
  const today = new Date()
  const startDate = new Date(sprint.start_date)
  const endDate = new Date(sprint.end_date)

  // Case 1: Future sprints are always 'pending'
  if (startDate > today) {
    return 'pending'
  }

  // Normalize null values
  const kpiTarget = sprint.kpi_target || 0
  const hoursUsed = sprint.hours_used || 0

  const hasKpiTracking = kpiTarget > 0  // Has a KPI target set (tracked in Monday)
  const hasHoursData = hoursUsed > 0    // Has hours logged (tracked in Clockify)

  // Case 2: Legacy sprints (completed before Clockify tracking started on Feb 2, 2025)
  // CRITICAL: Only sprints that ENDED before Feb 2, 2025 with no data
  const clockifyStartDate = new Date('2025-02-01')
  if (sprint.status === 'completed' && endDate < clockifyStartDate && !hasKpiTracking && !hasHoursData) {
    return 'legacy'
  }

  // Case 3: Partial tracking (started before Clockify tracking on Feb 1, 2025)
  // These sprints have incomplete hour tracking even if they have data
  if (startDate < clockifyStartDate) {
    return 'partial'
  }

  // Case 4: Fully tracked (has KPI tracking setup, regardless of hours logged yet)
  // For active sprints: if they have a KPI target, they're being tracked in Monday
  // Hours may be 0 simply because work just started or no time logged yet this period
  if (hasKpiTracking && (sprint.status === 'active' || sprint.status === 'pending' || hasHoursData)) {
    return 'fully_tracked'
  }

  // Case 5: KPI only (completed sprint with KPI but no hours ever logged)
  if (hasKpiTracking && !hasHoursData && sprint.status === 'completed') {
    return 'kpi_only'
  }

  // Case 6: Hours only (has hours but no KPI tracking setup)
  if (!hasKpiTracking && hasHoursData) {
    return 'hours_only'
  }

  // Case 7: Untracked (neither KPI nor hours)
  return 'untracked'
}

/**
 * Determine if a client has incomplete tracking
 * Only checks ACTIVE sprints (ignores completed/legacy)
 *
 * @param activeSprints - Array of active sprints for this client
 * @returns true if ANY active sprint has tracking issues
 */
export function hasIncompleteTracking(activeSprints: Array<{
  tracking_status: string
  status: string
}>): boolean {
  return activeSprints
    .filter(s => s.status === 'active')
    .some(s =>
      s.tracking_status === 'kpi_only' ||
      s.tracking_status === 'hours_only' ||
      s.tracking_status === 'untracked'
    )
}
