// Pure helpers for clients that disappear from Monday (no imports, so they
// can be unit-tested from the website's Vitest suite).

export const REMOVED_CLIENTS_URL = 'https://clientreport.vercel.app/dashboard/settings/removed-clients'

export interface RemovedClientSummary {
  name: string
  region: string | null
  group_name: string | null
  dpr_lead_name: string | null
  hours_total: number
  hours_last_30_days: number
  last_time_entry: string | null
  replacement_client_name: string | null
}

/** Slack incoming-webhook payload announcing one removed client. */
export function removedClientSlackMessage(c: RemovedClientSummary, url = REMOVED_CLIENTS_URL) {
  const hours = c.hours_total > 0
    ? `*${c.hours_total}h* logged in Clockify (${c.hours_last_30_days}h in the last 30 days, last entry ${c.last_time_entry ?? 'unknown'})`
    : 'No hours logged in Clockify'
  const lines = [
    `:warning: *${c.name}* was removed from the Monday ${c.region ?? ''} board`.replace(/\s+board/, ' board'),
    `DPR lead: ${c.dpr_lead_name ?? 'none'} · Group: ${c.group_name ?? 'unknown'}`,
    hours,
  ]
  if (c.replacement_client_name) {
    lines.push(`A live client with the same name exists, so the item was probably re-created in Monday.`)
  }
  lines.push(`<${url}|Review in the dashboard> (move to inactive or keep).`)
  const text = lines.join('\n')
  return { text, blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }] }
}

export interface ClientCandidate {
  id: string
  name: string
  is_active: boolean | null
  monday_removed_at: string | null
  monday_last_seen_at: string | null
}

/**
 * Best client for a Clockify project when several match: prefer clients still
 * on Monday, then active ones, then the most recently seen. Removed clients are
 * still used when nothing else matches, so cancelled-client time stays visible.
 */
export function pickBestClient<T extends ClientCandidate>(candidates: T[]): T | null {
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) =>
    Number(a.monday_removed_at !== null) - Number(b.monday_removed_at !== null) ||
    Number(b.is_active === true) - Number(a.is_active === true) ||
    (b.monday_last_seen_at ?? '').localeCompare(a.monday_last_seen_at ?? '')
  )[0]
}
