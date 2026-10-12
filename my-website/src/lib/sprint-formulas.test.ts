// Tests for the edge function's stored-metric formulas
// (supabase/functions/calculate-all-metrics). They are pure TypeScript, so
// they run under Vitest here as well as under Deno in production.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateMetricsForSprint, calculateSprintHealth, type SprintData } from '../../../supabase/functions/calculate-all-metrics/sprint-formulas'
import { calculateTrackingStatus, hasIncompleteTracking } from '../../../supabase/functions/calculate-all-metrics/tracking-calculator'

const today = new Date('2026-09-25T00:00:00Z')

const sprint = (overrides: Partial<SprintData> = {}, clients: Partial<SprintData['clients']> = {}): SprintData => ({
  id: 's1',
  client_id: 'c1',
  start_date: '2026-08-01',
  end_date: '2026-10-31',
  kpi_target: 10,
  kpi_achieved: 6,
  monthly_rate: null,
  status: 'active',
  ...overrides,
  clients: { monthly_hours: 40, monthly_rate: 3000, is_quarterly_rate: false, ...clients },
})

describe('calculateMetricsForSprint: hours and billable rate', () => {
  it('allocates three months of the client’s monthly hours', () => {
    const m = calculateMetricsForSprint(sprint(), 60, today)
    expect(m.hours_allocated).toBe(120)
    expect(m.hours_utilization_percent).toBe(50)
  })

  it('uses the client’s monthly rate x 3 when the sprint has none', () => {
    const m = calculateMetricsForSprint(sprint(), 60, today)
    expect(m.sprint_revenue).toBe(9000)
    expect(m.billable_rate).toBe(150) // 9000 / 60 h
  })

  it('prefers the sprint’s own monthly rate', () => {
    const m = calculateMetricsForSprint(sprint({ monthly_rate: 4000 }), 60, today)
    expect(m.sprint_revenue).toBe(12000)
    expect(m.billable_rate).toBe(200)
  })

  it('does not multiply a rate that is already quarterly', () => {
    const m = calculateMetricsForSprint(sprint({}, { is_quarterly_rate: true, monthly_rate: 9000 }), 60, today)
    expect(m.sprint_revenue).toBe(9000)
  })

  it('has no billable rate until hours are logged or when there is no revenue', () => {
    expect(calculateMetricsForSprint(sprint(), 0, today).billable_rate).toBeNull()
    expect(calculateMetricsForSprint(sprint({}, { monthly_rate: null }), 60, today).billable_rate).toBeNull()
  })

  it('rounds stored percentages to 1 decimal and rates to 2', () => {
    const m = calculateMetricsForSprint(sprint(), 70, today)
    expect(m.billable_rate).toBe(128.57) // 9000 / 70
    expect(m.hours_utilization_percent).toBe(58.3)
  })
})

describe('calculateSprintHealth (stored value)', () => {
  const health = (time: number, kpi: number, hours = 0, overrides: Partial<Record<string, unknown>> = {}) =>
    calculateSprintHealth(
      time, kpi, hours,
      (overrides.status as string) ?? 'active',
      (overrides.kpiAchieved as number) ?? 1,
      (overrides.kpiTarget as number) ?? 10,
      (overrides.startDate as string) ?? '2026-08-01',
      (overrides.endDate as string) ?? '2026-10-31',
      today
    )

  it('is not-started before the start date and completed after the end date', () => {
    expect(health(0, 0, 0, { startDate: '2026-10-01', endDate: '2026-12-31' })).toBe('not-started')
    expect(health(100, 50, 0, { endDate: '2026-09-01' })).toBe('completed')
  })
  it('flags hours running ahead of KPI progress', () => {
    expect(health(50, 45, 70)).toBe('needs-attention')
  })
  it('is ahead when KPI leads time', () => {
    expect(health(30, 50, 30)).toBe('ahead')
  })
  it('is kpi-complete once the target is reached', () => {
    expect(health(50, 100, 0, { kpiAchieved: 10 })).toBe('kpi-complete')
  })
})

describe('calculateTrackingStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(today)
  })
  afterEach(() => vi.useRealTimers())

  const status = (overrides: Record<string, unknown>) =>
    calculateTrackingStatus({ start_date: '2026-08-01', end_date: '2026-10-31', status: 'active', kpi_target: 10, hours_used: 5, ...overrides })

  it('is pending for future sprints', () => {
    expect(status({ start_date: '2026-10-01', end_date: '2026-12-31', status: 'pending' })).toBe('pending')
  })
  it('is legacy for data-less sprints that ended before Clockify', () => {
    expect(status({ start_date: '2024-09-01', end_date: '2024-12-01', status: 'completed', kpi_target: 0, hours_used: 0 })).toBe('legacy')
  })
  it('is partial for sprints that started before Clockify', () => {
    expect(status({ start_date: '2025-01-01', end_date: '2025-03-31', status: 'completed' })).toBe('partial')
  })
  it('is fully_tracked for active sprints with a KPI target, even before hours are logged', () => {
    expect(status({ hours_used: 0 })).toBe('fully_tracked')
  })
  it('distinguishes kpi_only, hours_only and untracked completed sprints', () => {
    const done = { start_date: '2026-03-01', end_date: '2026-05-31', status: 'completed' }
    expect(status({ ...done, hours_used: 0 })).toBe('kpi_only')
    expect(status({ ...done, kpi_target: 0 })).toBe('hours_only')
    expect(status({ ...done, kpi_target: 0, hours_used: null })).toBe('untracked')
  })
})

describe('hasIncompleteTracking', () => {
  it('is true when any active sprint is kpi_only, hours_only or untracked', () => {
    expect(hasIncompleteTracking([{ status: 'active', tracking_status: 'fully_tracked' }])).toBe(false)
    expect(hasIncompleteTracking([
      { status: 'active', tracking_status: 'fully_tracked' },
      { status: 'active', tracking_status: 'hours_only' },
    ])).toBe(true)
  })
  it('ignores sprints that are not active', () => {
    expect(hasIncompleteTracking([{ status: 'completed', tracking_status: 'untracked' }])).toBe(false)
  })
})
