import { describe, expect, it } from 'vitest'
import { buildDprDashboard, type DashboardClient, type DashboardSprint } from './dpr-dashboard'

const today = new Date('2026-09-25T00:00:00Z')

const client = (overrides: Partial<DashboardClient> = {}): DashboardClient => ({
  id: 'c1', name: 'Client', agency_value: null, monthly_rate: 3000, is_active: true, region: 'AU', niche: 'Retail',
  ...overrides,
})

const sprint = (overrides: Partial<DashboardSprint> = {}): DashboardSprint => ({
  id: 's1', client_id: 'c1', name: 'Sprint', sprint_number: 1,
  start_date: '2026-08-01', end_date: '2026-10-31',
  kpi_target: 10, kpi_achieved: 6, status: 'active',
  hours_used: 60, hours_allocated: 120, billable_rate: null,
  health_status: null, tracking_status: 'fully_tracked',
  clients: { id: 'c1', name: 'Client', niche: 'Retail' },
  ...overrides,
})

const completed = (overrides: Partial<DashboardSprint> = {}) =>
  sprint({ status: 'completed', start_date: '2026-03-01', end_date: '2026-05-31', kpi_achieved: 10, billable_rate: 150, ...overrides })

describe('buildDprDashboard', () => {
  it('splits clients by active flag', () => {
    const m = buildDprDashboard({ clients: [client(), client({ id: 'c2', is_active: false })], sprints: [] }, today)
    expect(m.activeClients.map(c => c.id)).toEqual(['c1'])
    expect(m.inactiveClients.map(c => c.id)).toEqual(['c2'])
  })

  it('computes progress for active sprints and sorts most urgent first', () => {
    const m = buildDprDashboard({
      clients: [client()],
      sprints: [
        sprint({ id: 'ok', kpi_achieved: 6 }),
        sprint({ id: 'late', kpi_achieved: 1 }),
      ],
    }, today)
    expect(m.activeSprints.map(s => s.id)).toEqual(['late', 'ok'])
    const ok = m.activeSprints.find(s => s.id === 'ok')!
    expect(ok.kpiProgress).toBe(60)
    expect(ok.hoursProgress).toBe(50)
    expect(ok.totalDays).toBe(91)
    expect(ok.daysElapsed).toBe(55)
    expect(m.healthCounts).toEqual({ 'on-track': 1, 'needs-attention': 1 })
  })

  it('analyses only completed, fully tracked sprints, newest first', () => {
    const m = buildDprDashboard({
      clients: [client()],
      sprints: [
        completed({ id: 'older', end_date: '2026-02-28', start_date: '2025-12-01' }),
        completed({ id: 'newer', billable_rate: 250 }),
        completed({ id: 'partial', tracking_status: 'partial' }),
        sprint({ id: 'active' }),
      ],
    }, today)
    expect(m.completedSprints.map(s => s.id)).toEqual(['newer', 'older'])
    expect(m.avgBillableRate).toBe(200)
    expect(m.performance.metWithinHours).toHaveLength(2)
  })

  it('counts completed sprints by niche, largest first', () => {
    const m = buildDprDashboard({
      clients: [client()],
      sprints: [
        completed({ id: 'a' }),
        completed({ id: 'b', clients: { id: 'c2', name: 'B', niche: 'Finance' } }),
        completed({ id: 'c', clients: { id: 'c3', name: 'C', niche: 'Finance' } }),
        completed({ id: 'd', clients: { id: 'c4', name: 'D', niche: null } }),
      ],
    }, today)
    expect(m.sprintsByNiche).toEqual([['Finance', 2], ['Retail', 1], ['Unknown', 1]])
  })

  it('collects legacy sprints separately', () => {
    const m = buildDprDashboard({
      clients: [client()],
      sprints: [completed({ id: 'old', tracking_status: 'legacy' })],
    }, today)
    expect(m.legacySprints.map(s => s.id)).toEqual(['old'])
    expect(m.completedSprints).toHaveLength(0)
  })
})
