import { describe, expect, it } from 'vitest'
import { pickBestClient, removedClientSlackMessage } from '../../../supabase/functions/_shared/removed-clients'
import { attachClientsToLog, removalActions, removalDateLabel } from './removed-clients'

const candidate = (id: string, o: Partial<{ is_active: boolean | null; monday_removed_at: string | null; monday_last_seen_at: string | null }> = {}) => ({
  id, name: 'Schweppes', is_active: true, monday_removed_at: null, monday_last_seen_at: '2026-09-25T03:00:00Z', ...o,
})

describe('pickBestClient', () => {
  it('prefers a client still on Monday over a removed duplicate', () => {
    const stale = candidate('stale', { monday_removed_at: '2026-09-20T03:00:00Z', monday_last_seen_at: '2026-09-19T03:00:00Z' })
    const live = candidate('live')
    expect(pickBestClient([stale, live])?.id).toBe('live')
    expect(pickBestClient([live, stale])?.id).toBe('live')
  })
  it('then prefers active, then most recently seen', () => {
    expect(pickBestClient([candidate('inactive', { is_active: false }), candidate('active')])?.id).toBe('active')
    expect(pickBestClient([candidate('older', { monday_last_seen_at: '2026-09-01T00:00:00Z' }), candidate('newer')])?.id).toBe('newer')
  })
  it('still returns a removed client when it is the only match', () => {
    expect(pickBestClient([candidate('only', { monday_removed_at: '2026-09-20T03:00:00Z' })])?.id).toBe('only')
    expect(pickBestClient([])).toBeNull()
  })
})

describe('removedClientSlackMessage', () => {
  const base = {
    name: 'Great Northern Beer Co.', region: 'AU', group_name: 'Active Campaigns - AU', dpr_lead_name: 'Clea Kanning',
    hours_total: 4.6, hours_last_30_days: 4.6, last_time_entry: '2026-09-24', replacement_client_name: null,
  }
  it('names the client, lead and logged hours, and links to the review page', () => {
    const { text } = removedClientSlackMessage(base, 'https://example.test/review')
    expect(text).toContain('*Great Northern Beer Co.* was removed from the Monday AU board')
    expect(text).toContain('DPR lead: Clea Kanning')
    expect(text).toContain('*4.6h* logged in Clockify (4.6h in the last 30 days, last entry 2026-09-24)')
    expect(text).toContain('<https://example.test/review|Review in the dashboard>')
    expect(text).not.toContain('re-created')
  })
  it('handles no hours, no lead and a re-created item', () => {
    const { text } = removedClientSlackMessage({ ...base, dpr_lead_name: null, hours_total: 0, hours_last_30_days: 0, last_time_entry: null, replacement_client_name: 'Great Northern Beer Co.', region: null })
    expect(text).toContain('No hours logged in Clockify')
    expect(text).toContain('DPR lead: none')
    expect(text).toContain('re-created in Monday')
    expect(text).toContain('removed from the Monday board')
  })
})

describe('removalActions', () => {
  const none = { time_entry_count: 0, has_kpi_results: false, replacement_client_id: null as unknown as string, replacement_client_name: null as unknown as string }
  it('allows delete only with no time logged and no KPI results', () => {
    expect(removalActions(none).canDelete).toBe(true)
    expect(removalActions({ ...none, time_entry_count: 1 }).canDelete).toBe(false)
    expect(removalActions({ ...none, has_kpi_results: true }).canDelete).toBe(false)
  })
  it('offers merge only into a re-created copy, and not when KPI results would be lost', () => {
    const recreated = { ...none, time_entry_count: 5, replacement_client_id: 'live', replacement_client_name: 'Great Northern Beer Co.' }
    expect(removalActions(recreated).mergeInto).toEqual({ id: 'live', name: 'Great Northern Beer Co.' })
    expect(removalActions(none).mergeInto).toBeNull()
    expect(removalActions({ ...recreated, has_kpi_results: true }).mergeInto).toBeNull()
  })
})

describe('removalDateLabel', () => {
  it('says "before" when the client was never seen by the tracking (removed before it began)', () => {
    expect(removalDateLabel('2026-09-25T03:00:00Z', null)).toBe('before 25 Sep 2026')
  })
  it('shows the flag date when it was seen within about a day (daily sync)', () => {
    expect(removalDateLabel('2026-10-02T03:00:00Z', '2026-10-01T03:00:00Z')).toBe('2 Oct 2026')
  })
  it('shows a range when it was last seen longer ago (e.g. syncs failed)', () => {
    expect(removalDateLabel('2026-10-05T03:00:00Z', '2026-10-01T03:00:00Z')).toBe('between 1 Oct and 5 Oct 2026')
    expect(removalDateLabel('2027-01-03T03:00:00Z', '2026-12-30T03:00:00Z')).toBe('between 30 Dec 2026 and 3 Jan 2027')
  })
})

describe('attachClientsToLog', () => {
  const log = [
    { id: 'a3', client_id: 'c1', action: 'deleted', performed_at: '2026-09-26T00:00:00Z' },
    { id: 'a2', client_id: 'c2', action: 'inactive', performed_at: '2026-09-25T12:00:00Z' },
    { id: 'a1', client_id: 'c2', action: 'keep', performed_at: '2026-09-25T10:00:00Z' },
  ]
  it('attaches a still-flagged client to its latest entry only', () => {
    const out = attachClientsToLog(log, [{ id: 'c2' }])
    expect(out.map(a => a.client?.id ?? null)).toEqual([null, 'c2', null])
  })
  it('attaches nothing to entries for deleted or merged clients', () => {
    expect(attachClientsToLog(log, []).every(a => a.client === null)).toBe(true)
  })
})
