'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Check, GitMerge, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

type Confirming = 'delete' | 'merge' | null

/**
 * Decisions for one removed client: one suggested action as a button (merge
 * when the item was re-created in Monday, otherwise "Move to inactive"), the
 * rest in a menu. Delete and merge are permanent, so each asks to confirm in
 * a dialog that says exactly what will happen.
 */
export function ReviewButtons({
  clientId,
  clientName,
  hoursTotal,
  sprintCount,
  showReview = true,
  canDelete,
  mergeInto,
}: {
  clientId: string
  clientName: string
  hoursTotal: number
  sprintCount: number
  showReview?: boolean
  canDelete: boolean
  mergeInto: { id: string; name: string } | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Confirming>(null)

  const run = (call: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError(null)
    startTransition(async () => {
      const { error } = await call()
      if (error) {
        setError(error.message)
      } else {
        setConfirming(null)
        router.refresh()
      }
    })
  }

  const supabase = createClient()
  const decide = (decision: 'inactive' | 'keep') =>
    run(() => supabase.rpc('review_removed_client', { p_client_id: clientId, p_decision: decision }))
  const remove = () => run(() => supabase.rpc('delete_removed_client', { p_client_id: clientId }))
  const merge = () =>
    mergeInto && run(() => supabase.rpc('merge_removed_client', { p_client_id: clientId, p_into_client_id: mergeInto.id }))

  const primary = mergeInto ? 'merge' : showReview ? 'inactive' : null
  const showInactiveItem = showReview && primary !== 'inactive'
  const hasMenu = showReview || canDelete

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1">
        {primary === 'merge' && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirming('merge')}
            title={`Move all time entries to the live ${mergeInto?.name}, then delete this copy`}
          >
            <GitMerge /> Merge into new copy
          </Button>
        )}
        {primary === 'inactive' && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => decide('inactive')}>
            <Archive /> Move to inactive
          </Button>
        )}
        {hasMenu && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={isPending} aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showInactiveItem && (
                <DropdownMenuItem onSelect={() => decide('inactive')}>
                  <Archive /> Move to inactive
                </DropdownMenuItem>
              )}
              {showReview && (
                <DropdownMenuItem onSelect={() => decide('keep')}>
                  <Check /> Keep active
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  {showReview && <DropdownMenuSeparator />}
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirming('delete')}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {error && !confirming && <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">{error}</p>}

      <Dialog
        open={confirming !== null}
        onOpenChange={open => {
          if (!open && !isPending) {
            setConfirming(null)
            setError(null)
          }
        }}
      >
        <DialogContent>
          {confirming === 'delete' ? (
            <DialogHeader>
              <DialogTitle>Delete {clientName}?</DialogTitle>
              <DialogDescription>
                This permanently removes the client from the dashboard
                {sprintCount > 0 ? `, along with its ${sprintCount} sprint${sprintCount === 1 ? '' : 's'} (no hours or KPI results)` : ''}.
                It has no time logged. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
          ) : (
            <DialogHeader>
              <DialogTitle>Merge into the new {mergeInto?.name}?</DialogTitle>
              <DialogDescription>
                {hoursTotal > 0
                  ? `All ${hoursTotal}h logged against this old copy will move to the live client and be placed in its sprints by date. `
                  : 'This old copy has no time logged. '}
                The old copy is then deleted. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={() => { setConfirming(null); setError(null) }}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={confirming === 'delete' ? remove : merge}>
              {isPending ? 'Working…' : confirming === 'delete' ? 'Delete client' : 'Merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
