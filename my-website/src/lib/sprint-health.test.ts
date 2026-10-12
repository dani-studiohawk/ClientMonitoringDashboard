import { describe, expect, it } from 'vitest'
import { calculateSprintHealth, getSprintHealth, normalizeHealth, withSprintDefaults } from './sprint-health'

const today = new Date('2026-09-25T00:00:00Z')
// 1 Aug – 31 Oct: on 25 Sep roughly 60% of the time has elapsed
const sprint = (overrides: Record<string, unknown> = {}) => ({
  status: 'active',
  kpi_achieved: 0,
  kpi_target: 10,
  start_date: '2026-08-01',
  end_date: '2026-10-31',
  health_status: null as string | null,
  ...overrides,
})

describe('normalizeHealth', () => {
  it('maps the legacy at-risk / behind values to needs-attention', () => {
    expect(normalizeHealth('at-risk')).toBe('needs-attention')
    expect(normalizeHealth('behind')).toBe('needs-attention')
    expect(normalizeHealth('At Risk')).toBe('needs-attention')
  })
  it('passes current values through and rejects unknown ones', () => {
    expect(normalizeHealth('kpi-complete')).toBe('kpi-complete')
    expect(normalizeHealth('On Track')).toBe('on-track')
    expect(normalizeHealth('garbage')).toBeNull()
    expect(normalizeHealth(null)).toBeNull()
  })
})

describe('calculateSprintHealth', () => {
  it('is completed once the end date has passed or the status says so', () => {
    expect(calculateSprintHealth(sprint({ end_date: '2026-09-01' }), today)).toBe('completed')
    expect(calculateSprintHealth(sprint({ status: 'completed' }), today)).toBe('completed')
  })
  it('is not-started before the start date', () => {
    expect(calculateSprintHealth(sprint({ start_date: '2026-10-01', end_date: '2026-12-31' }), today)).toBe('not-started')
  })
  it('treats a sprint with no KPI target as on-track', () => {
    expect(calculateSprintHealth(sprint({ kpi_target: 0 }), today)).toBe('on-track')
    expect(calculateSprintHealth(sprint({ kpi_target: null }), today)).toBe('on-track')
  })
  it('is kpi-complete when the target is reached', () => {
    expect(calculateSprintHealth(sprint({ kpi_achieved: 10 }), today)).toBe('kpi-complete')
  })
  it('flags needs-attention when KPI lags time', () => {
    expect(calculateSprintHealth(sprint({ kpi_achieved: 1 }), today)).toBe('needs-attention') // ~60% time, 10% KPI
    expect(calculateSprintHealth(sprint({ kpi_achieved: 4 }), today)).toBe('needs-attention') // lags by > 15 points
  })
  it('is ahead when KPI leads time by more than 10 points', () => {
    expect(calculateSprintHealth(sprint({ kpi_achieved: 9 }), today)).toBe('ahead')
  })
  it('is on-track when KPI roughly matches time', () => {
    expect(calculateSprintHealth(sprint({ kpi_achieved: 6 }), today)).toBe('on-track')
  })
})

describe('getSprintHealth', () => {
  it('prefers the stored value', () => {
    expect(getSprintHealth(sprint({ health_status: 'ahead', kpi_achieved: 1 }), today)).toBe('ahead')
  })
  it('shows not-started for future sprints even if something else is stored', () => {
    expect(
      getSprintHealth(sprint({ start_date: '2026-10-01', end_date: '2026-12-31', status: 'pending', health_status: 'on-track' }), today)
    ).toBe('not-started')
  })
  it('lets a completed status win over a future start date', () => {
    expect(getSprintHealth(sprint({ status: 'completed', start_date: '2026-10-01', end_date: '2026-12-31' }), today)).toBe('completed')
  })
  it('falls back to the calculation when nothing is stored', () => {
    expect(getSprintHealth(sprint({ kpi_achieved: 10 }), today)).toBe('kpi-complete')
  })
})

describe('withSprintDefaults', () => {
  it('fills null KPI and hours with 0 and keeps other fields', () => {
    expect(withSprintDefaults([{ id: 'a', kpi_achieved: null, hours_allocated: null }])).toEqual([
      { id: 'a', kpi_achieved: 0, hours_allocated: 0 },
    ])
    expect(withSprintDefaults(null)).toEqual([])
  })
})
