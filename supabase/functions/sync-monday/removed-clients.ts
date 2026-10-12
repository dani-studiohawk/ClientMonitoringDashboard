// Flag clients that are no longer on a Monday board, and tell Slack once.
import type { DbClient } from '../_shared/db.ts'
import { removedClientSlackMessage, type RemovedClientSummary } from '../_shared/removed-clients.ts'

/**
 * Mark clients of `region` whose Monday item wasn't seen in a complete read of
 * the board. Returns how many were newly flagged.
 */
export async function flagMissingClients(supabase: DbClient, region: string, seenItemIds: Set<number>): Promise<number> {
  if (seenItemIds.size === 0) return 0 // never flag a whole board on an empty read

  const { data, error } = await supabase
    .from('clients')
    .update({ monday_removed_at: new Date().toISOString() })
    .eq('region', region)
    .is('monday_removed_at', null)
    .not('monday_item_id', 'in', `(${[...seenItemIds].join(',')})`)
    .select('id, name')

  if (error) throw new Error(`Flagging removed ${region} clients failed: ${error.message}`)
  for (const c of data ?? []) console.log(`Removed from Monday (${region}): ${c.name}`)
  return data?.length ?? 0
}

/** Send one Slack message per removed client not yet announced. */
export async function notifyRemovedClients(supabase: DbClient, webhookUrl: string | undefined): Promise<number> {
  if (!webhookUrl) {
    console.log('SLACK_WEBHOOK_URL not set; skipping removed-client notifications')
    return 0
  }

  const { data: pending, error } = await supabase
    .from('clients')
    .select('id')
    .not('monday_removed_at', 'is', null)
    .is('removal_notified_at', null)
  if (error) throw new Error(`Loading removed clients failed: ${error.message}`)
  if (!pending?.length) return 0

  // Same summary the dashboard shows (hours, replacement)
  const { data: summaries, error: rpcError } = await supabase.rpc('get_removed_clients')
  if (rpcError) throw new Error(`Loading removed-client summaries failed: ${rpcError.message}`)

  let sent = 0
  for (const { id } of pending) {
    const summary = (summaries as (RemovedClientSummary & { id: string })[] | null)?.find(s => s.id === id)
    if (!summary) continue
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(removedClientSlackMessage(summary)),
    })
    if (!res.ok) {
      console.error(`Slack notification for ${summary.name} failed: ${res.status}`)
      continue // retried on the next sync
    }
    await supabase.from('clients').update({ removal_notified_at: new Date().toISOString() }).eq('id', id)
    sent++
  }
  return sent
}
