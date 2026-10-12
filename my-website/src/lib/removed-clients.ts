import { format } from 'date-fns'
import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Clients flagged as removed from Monday (admins only; empty for others). */
export async function fetchRemovedClients(supabase: ServerClient) {
  const { data } = await supabase.rpc('get_removed_clients')
  const clients = data ?? []
  if (clients.length === 0) return []

  // When each was last seen on Monday, to say how precise the removal date is
  const { data: seen } = await supabase
    .from('clients')
    .select('id, monday_last_seen_at')
    .in('id', clients.map(c => c.id))
  const lastSeen = new Map((seen ?? []).map(s => [s.id, s.monday_last_seen_at]))
  return clients.map(c => ({ ...c, monday_last_seen_at: lastSeen.get(c.id) ?? null }))
}

export type RemovedClient = Awaited<ReturnType<typeof fetchRemovedClients>>[number]

/** Log of decisions on removed clients (inactive, keep, deleted, merged), newest first (admins only). */
export async function fetchClientAdminActions(supabase: ServerClient) {
  const { data } = await supabase
    .from('client_admin_actions')
    .select('id, action, client_id, client_name, region, merged_into_client_id, merged_into_client_name, time_entries_moved, hours_moved, sprints_deleted, performed_at, performer:users(name)')
    .order('performed_at', { ascending: false })
    .limit(50)
  return data ?? []
}

export type ClientAdminAction = Awaited<ReturnType<typeof fetchClientAdminActions>>[number]

export function pendingReview(clients: RemovedClient[]): RemovedClient[] {
  return clients.filter(c => !c.removal_reviewed_at)
}

/**
 * What can be done to a removed client beyond inactive/keep. Mirrors the checks
 * in delete_removed_client / merge_removed_client, which enforce them.
 * - delete: nothing recorded would be lost (no time entries, no KPI results)
 * - merge: a live copy with the same name exists and no KPI results would be lost
 */
export function removalActions(c: Pick<RemovedClient, 'time_entry_count' | 'has_kpi_results' | 'replacement_client_id' | 'replacement_client_name'>) {
  return {
    canDelete: c.time_entry_count === 0 && !c.has_kpi_results,
    mergeInto: c.replacement_client_id && !c.has_kpi_results
      ? { id: c.replacement_client_id, name: c.replacement_client_name }
      : null,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * When a client left Monday, as precisely as we know it. The sync flags a
 * client the first time it's missing (removedAt); it was last on the board at
 * lastSeenAt. With daily syncs that's within a day, so the flag date is shown.
 * - never seen (removed before tracking began, 25 Sep 2026): "before <date>"
 * - seen more than ~a day before it was flagged (e.g. syncs failed): a range
 */
export function removalDateLabel(removedAt: string, lastSeenAt: string | null): string {
  const removed = new Date(removedAt)
  if (!lastSeenAt) return `before ${format(removed, 'd MMM yyyy')}`
  const seen = new Date(lastSeenAt)
  if (removed.getTime() - seen.getTime() <= 1.5 * DAY_MS) return format(removed, 'd MMM yyyy')
  const from = format(seen, seen.getFullYear() === removed.getFullYear() ? 'd MMM' : 'd MMM yyyy')
  return `between ${from} and ${format(removed, 'd MMM yyyy')}`
}

/**
 * Pairs each log entry with the removed client it's about, on that client's
 * most recent entry only, while the client still exists and is still flagged.
 * That row carries the client link and any remaining actions (delete, merge).
 */
export function attachClientsToLog<A extends { client_id?: string; performed_at: string }, C extends { id: string }>(
  log: A[],
  clients: C[],
): (A & { client: C | null })[] {
  const byId = new Map(clients.map(c => [c.id, c]))
  const latest = new Map<string, A>()
  for (const a of log) {
    if (!a.client_id) continue
    const prev = latest.get(a.client_id)
    if (!prev || a.performed_at > prev.performed_at) latest.set(a.client_id, a)
  }
  return log.map(a => ({
    ...a,
    client: a.client_id && latest.get(a.client_id) === a ? byId.get(a.client_id) ?? null : null,
  }))
}
