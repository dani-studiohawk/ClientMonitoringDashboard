import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

/** Banner shown to admins while removed clients are waiting for review. */
export function RemovedClientsAlert({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <Link
      href="/dashboard/settings/removed-clients"
      className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <span>
        <strong>{count} {count === 1 ? 'client was' : 'clients were'} removed from Monday</strong> and{' '}
        {count === 1 ? 'needs' : 'need'} reviewing. Check for hours logged before deciding.
      </span>
      <span className="ml-auto whitespace-nowrap font-medium">Review →</span>
    </Link>
  )
}
