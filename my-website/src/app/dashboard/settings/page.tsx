import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/dashboard/current-user'
import { fetchRemovedClients, pendingReview } from '@/lib/removed-clients'

/** Admin settings: housekeeping pages that don't belong in the main navigation. */
export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.is_admin) redirect('/dashboard')

  const supabase = await createClient()
  const pending = pendingReview(await fetchRemovedClients(supabase)).length

  const sections = [
    {
      href: '/dashboard/settings/removed-clients',
      icon: UserX,
      title: 'Removed clients',
      description: 'Clients deleted from a Monday board: review, move to inactive, delete or merge, and the log of decisions.',
      badge: pending > 0 ? `${pending} to review` : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Admin only.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(s => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="h-full transition-colors group-hover:border-gray-400 dark:group-hover:border-gray-500">
              <CardContent className="flex items-start gap-4">
                <s.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{s.title}</span>
                    {s.badge && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{s.badge}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
