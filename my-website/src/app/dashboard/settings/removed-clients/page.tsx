import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/dashboard/current-user'
import {
  attachClientsToLog,
  fetchClientAdminActions,
  fetchRemovedClients,
  pendingReview,
  removalActions,
  removalDateLabel,
  type ClientAdminAction,
  type RemovedClient,
} from '@/lib/removed-clients'
import { ReviewButtons } from '@/components/removed-clients/review-buttons'

const formatDate = (d: string | null) => (d ? format(new Date(d), 'd MMM yyyy') : '-')

function ClientCell({ c }: { c: RemovedClient }) {
  return (
    <div className="space-y-1">
      <Link
        href={`/dashboard/clients/${c.id}`}
        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {c.name}
      </Link>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {c.region ?? '-'} · {c.group_name ?? 'no group'}
      </div>
      {c.replacement_client_id && (
        <div className="text-xs">
          Re-created in Monday as{' '}
          <Link href={`/dashboard/clients/${c.replacement_client_id}`} className="text-blue-600 hover:underline dark:text-blue-400">
            a new {c.replacement_client_name}
          </Link>
        </div>
      )}
    </div>
  )
}

function Hours({ c }: { c: RemovedClient }) {
  if (!c.hours_total) return <span className="text-gray-500 dark:text-gray-400">None</span>
  return (
    <div className="space-y-1">
      <div className="font-semibold text-amber-700 dark:text-amber-400">{c.hours_total}h total</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {c.hours_last_30_days}h in last 30 days · last {formatDate(c.last_time_entry)}
      </div>
    </div>
  )
}

function RemovedWhen({ c }: { c: RemovedClient }) {
  const label = removalDateLabel(c.monday_removed_at, c.monday_last_seen_at)
  return <>{label.charAt(0).toUpperCase() + label.slice(1)}</>
}

function Actions({ c, showReview }: { c: RemovedClient; showReview: boolean }) {
  const { canDelete, mergeInto } = removalActions(c)
  return (
    <ReviewButtons
      clientId={c.id}
      clientName={c.name}
      hoursTotal={Number(c.hours_total)}
      sprintCount={c.sprint_count}
      showReview={showReview}
      canDelete={canDelete}
      mergeInto={mergeInto}
    />
  )
}

function ActionSummary({ a }: { a: ClientAdminAction }) {
  switch (a.action) {
    case 'inactive':
      return <Badge variant="secondary">Moved to inactive</Badge>
    case 'keep':
      return <Badge variant="outline">Kept active</Badge>
    case 'deleted':
      return <span>Deleted{a.sprints_deleted ? ` with ${a.sprints_deleted} empty sprint${a.sprints_deleted === 1 ? '' : 's'}` : ''}</span>
    default:
      return (
        <span>
          Merged into{' '}
          {a.merged_into_client_id ? (
            <Link href={`/dashboard/clients/${a.merged_into_client_id}`} className="text-blue-600 hover:underline dark:text-blue-400">
              {a.merged_into_client_name}
            </Link>
          ) : (
            a.merged_into_client_name
          )}
          {a.time_entries_moved > 0 && ` (${Number(a.hours_moved).toFixed(1)}h, ${a.time_entries_moved} entries moved)`}
        </span>
      )
  }
}

export default async function RemovedClientsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.is_admin) redirect('/dashboard')

  const supabase = await createClient()
  const [clients, history] = await Promise.all([fetchRemovedClients(supabase), fetchClientAdminActions(supabase)])
  const pending = pendingReview(clients)
  const log = attachClientsToLog(history, clients)

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/settings">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Removed from Monday</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Clients that are no longer on a Monday board. Their data and time entries are kept.
          Hours logged here may be unbilled work (e.g. a cancellation in the cooldown period).
          Delete is offered only when a client has no time logged; merge moves its time to the
          client re-created in Monday under the same name.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Needs review ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="py-6 text-center text-gray-500 dark:text-gray-400">Nothing to review.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>DPR Lead</TableHead>
                  <TableHead>Removed</TableHead>
                  <TableHead>Hours logged</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="min-w-48 whitespace-normal"><ClientCell c={c} /></TableCell>
                    <TableCell>{c.dpr_lead_name ?? '-'}</TableCell>
                    <TableCell><RemovedWhen c={c} /></TableCell>
                    <TableCell><Hours c={c} /></TableCell>
                    <TableCell className="text-right"><Actions c={c} showReview /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Log ({log.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>What happened</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="min-w-48 whitespace-normal">
                      {a.client ? (
                        <Link
                          href={`/dashboard/clients/${a.client.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {a.client_name}
                        </Link>
                      ) : (
                        <div className="font-medium">{a.client_name}</div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400">{a.region ?? '-'}</div>
                    </TableCell>
                    <TableCell className="whitespace-normal"><ActionSummary a={a} /></TableCell>
                    <TableCell>{a.performer?.name ?? '-'}</TableCell>
                    <TableCell>{formatDate(a.performed_at)}</TableCell>
                    <TableCell className="text-right">{a.client && <Actions c={a.client} showReview={false} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
