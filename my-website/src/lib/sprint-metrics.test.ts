import { describe, expect, it } from 'vitest'
import {
  averageBillableRate,
  groupByPerformance,
  hoursUtilisation,
  isAnalysable,
  kpiHitRate,
  kpiMet,
  performanceBucket,
} from './sprint-metrics'

const sprint = (overrides: Record<string, unknown> = {}) => ({
  status: 'completed',
  tracking_status: 'fully_tracked',
  kpi_target: 10,
  kpi_achieved: 10,
  hours_used: 90 as number | null,
  hours_allocated: 100,
  billable_rate: 150 as number | null,
  ...overrides,
})

describe('isAnalysable', () => {
  it('only accepts completed, fully tracked sprints', () => {
    expect(isAnalysable(sprint())).toBe(true)
    expect(isAnalysable(sprint({ status: 'active' }))).toBe(false)
    expect(isAnalysable(sprint({ tracking_status: 'partial' }))).toBe(false)
  })
})

describe('kpiMet', () => {
  it('needs a positive target that was reached', () => {
    expect(kpiMet(sprint())).toBe(true)
    expect(kpiMet(sprint({ kpi_achieved: 9 }))).toBe(false)
    expect(kpiMet(sprint({ kpi_target: 0, kpi_achieved: 5 }))).toBe(false)
  })
})

describe('performanceBucket', () => {
  it('splits by KPI met/missed and within/over hours', () => {
    expect(performanceBucket(sprint())).toBe('metWithinHours')
    expect(performanceBucket(sprint({ hours_used: 120 }))).toBe('metAboveHours')
    expect(performanceBucket(sprint({ kpi_achieved: 5 }))).toBe('missedWithinHours')
    expect(performanceBucket(sprint({ kpi_achieved: 5, hours_used: 120 }))).toBe('missedAboveHours')
  })
  it('counts exactly the allocated hours as within', () => {
    expect(performanceBucket(sprint({ hours_used: 100 }))).toBe('metWithinHours')
  })
  it('treats missing hours used as 0', () => {
    expect(performanceBucket(sprint({ hours_used: null }))).toBe('metWithinHours')
  })
  it('cannot judge sprints without a KPI target or allocated hours', () => {
    expect(performanceBucket(sprint({ kpi_target: 0 }))).toBeNull()
    expect(performanceBucket(sprint({ hours_allocated: 0 }))).toBeNull()
  })
})

describe('groupByPerformance', () => {
  it('places each sprint in one bucket and skips unjudgeable ones', () => {
    const groups = groupByPerformance([sprint(), sprint({ hours_used: 120 }), sprint({ kpi_target: 0 })])
    expect(groups.metWithinHours).toHaveLength(1)
    expect(groups.metAboveHours).toHaveLength(1)
    expect(groups.missedWithinHours).toHaveLength(0)
    expect(groups.missedAboveHours).toHaveLength(0)
  })
})

describe('averageBillableRate', () => {
  it('is the simple mean of the rates', () => {
    expect(averageBillableRate([sprint({ billable_rate: 100 }), sprint({ billable_rate: 200 })])).toBe(150)
    expect(averageBillableRate([sprint({ billable_rate: 120 })])).toBe(120)
  })
  it('skips sprints with no rate and returns 0 when there are none', () => {
    expect(averageBillableRate([sprint({ billable_rate: 100 }), sprint({ billable_rate: null })])).toBe(100)
    expect(averageBillableRate([])).toBe(0)
  })
})

describe('kpiHitRate', () => {
  it('is the share of targeted sprints that hit their target', () => {
    expect(kpiHitRate([sprint(), sprint({ kpi_achieved: 5 }), sprint({ kpi_target: 0 })])).toBe(50)
    expect(kpiHitRate([])).toBe(0)
  })
})

describe('hoursUtilisation', () => {
  it('is used / allocated as a percentage, 0 when nothing is allocated', () => {
    expect(hoursUtilisation(90, 120)).toBe(75)
    expect(hoursUtilisation(10, 0)).toBe(0)
  })
})
