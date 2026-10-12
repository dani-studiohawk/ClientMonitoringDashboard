import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/dashboard/current-user'
import { buildDprDashboard, fetchDprDashboardData } from '@/lib/dashboard/dpr-dashboard'
import { DprDashboard } from '@/components/dashboard/dpr/dpr-dashboard'
import { AdminLeadList } from '@/components/dashboard/admin-lead-list'
import { NoAccess } from '@/components/dashboard/no-access'
import { fetchRemovedClients, pendingReview } from '@/lib/removed-clients'

interface PageProps {
  searchParams: Promise<{ dpr?: string }>
}

async function renderDprDashboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lead: { id: string; name: string }
) {
  const data = await fetchDprDashboardData(supabase, lead.id)
  return <DprDashboard leadName={lead.name} model={buildDprDashboard(data)} />
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const userProfile = await getCurrentUser()
  if (!userProfile) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { dpr: dprIdFromUrl } = await searchParams

  // Admin viewing a specific DPR lead's dashboard
  if (userProfile.is_admin && dprIdFromUrl) {
    const { data: dprLead } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', dprIdFromUrl)
      .eq('is_dpr_lead', true)
      .single()

    if (dprLead) {
      return renderDprDashboard(supabase, dprLead)
    }
  }

  // Admin landing page: list of DPR leads
  if (userProfile.is_admin) {
    const { data: dprLeads } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('is_dpr_lead', true)
      .eq('is_active', true)
      .order('name')

    const removedPending = pendingReview(await fetchRemovedClients(supabase)).length

    return <AdminLeadList adminEmail={userProfile.email} leads={dprLeads ?? []} removedPendingCount={removedPending} />
  }

  // DPR lead: their own dashboard
  if (userProfile.is_dpr_lead) {
    return renderDprDashboard(supabase, userProfile)
  }

  return <NoAccess name={userProfile.name} />
}
