import { describe, expect, it } from 'vitest'
import { billableRateColor, hoursBarColor, kpiBarColor } from './traffic-lights'

describe('traffic lights', () => {
  it('KPI bar: red below 80%, amber to 99%, green from 100%', () => {
    expect(kpiBarColor(79.9)).toContain('red')
    expect(kpiBarColor(80)).toContain('amber')
    expect(kpiBarColor(99.9)).toContain('amber')
    expect(kpiBarColor(100)).toContain('green')
  })
  it('hours bar: green up to 100%, amber to 110%, red above', () => {
    expect(hoursBarColor(100)).toContain('green')
    expect(hoursBarColor(100.1)).toContain('amber')
    expect(hoursBarColor(110)).toContain('amber')
    expect(hoursBarColor(110.1)).toContain('red')
  })
  it('billable rate: red below $150, amber to $189, green from $190', () => {
    expect(billableRateColor(149)).toContain('red')
    expect(billableRateColor(150)).toContain('amber')
    expect(billableRateColor(189.99)).toContain('amber')
    expect(billableRateColor(190)).toContain('green')
  })
})
