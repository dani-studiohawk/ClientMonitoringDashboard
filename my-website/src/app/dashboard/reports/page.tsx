import { createClient } from '@/lib/supabase/server'
import { withSprintDefaults } from '@/lib/sprint-health'
import { averageBillableRate, groupByPerformance, hoursUtilisation, isAnalysable, kpiHitRate, kpiMet } from '@/lib/sprint-metrics'
import { summarisePersonTime, taskTableByPerson } from '@/lib/person-time'
import { redirect } from 'next/navigation'
import { ReportsTabs } from '@/components/reports/reports-tabs'

async function checkAdminAccess() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return false
  }

  const { data: isAdmin, error } = await supabase.rpc('is_current_user_admin')

  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }

  return isAdmin || false
}

export default async function ReportsPage() {
  const isAdmin = await checkAdminAccess()

  if (!isAdmin) {
    redirect('/dashboard?error=admin_only')
  }

  const supabase = await createClient()

  // Get all DPR leads with their clients and sprints
  const { data: dprLeadsRaw } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('is_dpr_lead', true)

  const dprLeads = dprLeadsRaw?.sort((a, b) => a.name.localeCompare(b.name))

  // Get all clients with their DPR lead
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, dpr_lead_id, is_active, niche')
    .not('dpr_lead_id', 'is', null)

  // Get all sprints
  const { data: sprintsRaw } = await supabase
    .from('sprints')
    .select(`
      id,
      client_id,
      sprint_number,
      status,
      tracking_status,
      kpi_target,
      kpi_achieved,
      hours_used,
      hours_allocated,
      billable_rate,
      end_date,
      clients!inner (
        id,
        name,
        dpr_lead_id,
        niche
      )
    `)
    .order('end_date', { ascending: false })
  const sprints = withSprintDefaults(sprintsRaw)

  // Add DPR lead names to sprints
  const sprintsWithLeads = sprints.map(sprint => {
    const dprLead = dprLeads?.find(lead => lead.id === sprint.clients.dpr_lead_id)
    return {
      ...sprint,
      clients: {
        ...sprint.clients,
        dpr_lead_name: dprLead?.name || null
      }
    }
  })

  // Calculate metrics for each DPR lead
  const dprMetrics = dprLeads?.map(lead => {
    const leadClients = clients?.filter(c => c.dpr_lead_id === lead.id) || []
    const activeClients = leadClients.filter(c => c.is_active)
    const leadSprints = sprintsWithLeads?.filter(s => s.clients?.dpr_lead_id === lead.id) || []
    const activeSprints = leadSprints.filter(s => s.status === 'active')
    
    // Only use completed fully tracked sprints
    const completedTrackedSprints = leadSprints
      .filter(isAnalysable)
      .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())

    const avgBillableRate = averageBillableRate(completedTrackedSprints)
    const groups = groupByPerformance(completedTrackedSprints)
    const avgKpiPerformance = kpiHitRate(completedTrackedSprints)

    return {
      ...lead,
      activeClientsCount: activeClients.length,
      totalClientsCount: leadClients.length,
      activeSprintsCount: activeSprints.length,
      completedSprintsCount: completedTrackedSprints.length,
      avgBillableRate,
      avgKpiPerformance,
      metKpiWithinHours: groups.metWithinHours.length,
      metKpiAboveHours: groups.metAboveHours.length,
      missedKpiWithinHours: groups.missedWithinHours.length,
      missedKpiAboveHours: groups.missedAboveHours.length,
    }
  }) || []

  // Time Tracking tab: each lead's own logged time. Sprints only count for a
  // person when they logged more than 5 hours on them (see the SQL function).
  const { data: personTimeRows } = await supabase
    .rpc('get_time_tracking_by_person')

  const leadIds = (dprLeads || []).map((lead) => lead.id)
  const timeTrackingData = { tasks: taskTableByPerson(personTimeRows || [], leadIds) }

  const personTime = Object.fromEntries(
    leadIds.map((id) => [id, summarisePersonTime(personTimeRows || [], id)])
  )

  // Calculate niche-based analytics
  const nicheMetrics = sprintsWithLeads
    .filter(isAnalysable)
    .reduce((acc, sprint) => {
      const niche = sprint.clients?.niche || 'Uncategorized'
      
      if (!acc[niche]) {
        acc[niche] = {
          niche,
          totalSprints: 0,
          metKpi: 0,
          totalHours: 0,
          totalAllocatedHours: 0,
          totalBillableRate: 0,
          sprintsWithBillableRate: 0,
        }
      }
      
      acc[niche].totalSprints++
      if (kpiMet(sprint)) {
        acc[niche].metKpi++
      }
      acc[niche].totalHours += sprint.hours_used || 0
      acc[niche].totalAllocatedHours += sprint.hours_allocated || 0
      if (sprint.billable_rate) {
        acc[niche].totalBillableRate += sprint.billable_rate
        acc[niche].sprintsWithBillableRate++
      }
      
      return acc
    }, {} as Record<string, {
      niche: string
      totalSprints: number
      metKpi: number
      totalHours: number
      totalAllocatedHours: number
      totalBillableRate: number
      sprintsWithBillableRate: number
    }>)

  const nicheStats = nicheMetrics ? Object.values(nicheMetrics).map(n => ({
    ...n,
    kpiHitRate: n.totalSprints > 0 ? (n.metKpi / n.totalSprints) * 100 : 0,
    avgBillableRate: n.sprintsWithBillableRate > 0 ? n.totalBillableRate / n.sprintsWithBillableRate : 0,
    hoursUtilization: hoursUtilisation(n.totalHours, n.totalAllocatedHours),
  })).sort((a, b) => b.totalSprints - a.totalSprints) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analytics & Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Performance insights across DPR leads and niches
        </p>
      </div>

      <ReportsTabs 
        dprMetrics={dprMetrics}
        nicheStats={nicheStats}
        clients={clients || []}
        sprintsWithLeads={sprintsWithLeads}
        timeTrackingData={timeTrackingData}
        personTime={personTime}
      />
    </div>
  )
}
