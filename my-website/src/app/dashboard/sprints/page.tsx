import { createClient } from '@/lib/supabase/server'
import { SprintCardGrid, SprintWithCalculations } from '@/components/sprints/sprint-card'
import { SprintFilters } from '@/components/sprints/sprint-filters'
import { getSprintHealth } from '@/lib/sprint-health'

interface SearchParams {
  health?: string
  tracking?: string
  clientId?: string
  dprLeadId?: string
  sort?: string
  activeOnly?: string
}

export default async function SprintsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  // Default activeOnly to true if not specified
  const activeOnly = params.activeOnly !== 'false'
  
  // Get sprints with client info and pre-calculated health status and tracking status
  let query = supabase
    .from('sprints')
    .select(`
      *,
      health_status,
      tracking_status,
      billable_rate,
      hours_used,
      clients (
        id,
        name,
        monthly_hours,
        report_status,
        is_active,
        dpr_lead_id,
        dpr_lead:users!clients_dpr_lead_id_fkey (
          id,
          name
        )
      )
    `)

  // Filter by active sprints only if toggle is on (default: ON)
  if (activeOnly) {
    query = query.eq('status', 'active')
  }

  // Filter by client
  if (params.clientId) {
    query = query.eq('client_id', params.clientId)
  }

  const { data: sprints, error } = await query

  if (error) {
    console.error('Error fetching sprints:', error)
  }

  // Get hours used per sprint using database function (much faster than fetching all entries)
  const sprintIds = sprints?.map(s => s.id) || []
  const hoursMap: Record<string, number> = {}
  
  if (sprintIds.length > 0) {
    const { data: hoursData } = await supabase
      .rpc('get_sprint_hours', { sprint_ids: sprintIds })
    
    if (hoursData) {
      hoursData.forEach((row: { sprint_id: string; total_hours: number }) => {
        hoursMap[row.sprint_id] = row.total_hours || 0
      })
    }
  }

  // Add hours to sprints. With "active sprints only" on (the default), also hide
  // inactive clients (paused, refunded, completed campaigns); turning it off
  // shows every sprint, including past clients'.
  let sprintsWithHours: SprintWithCalculations[] = (sprints || [])
    .filter(sprint => !activeOnly || sprint.clients?.is_active !== false)
    .map(sprint => ({
      ...sprint,
      kpi_achieved: sprint.kpi_achieved ?? 0,
      status: (sprint.status ?? 'pending') as SprintWithCalculations['status'],
      hours_used: hoursMap[sprint.id] || 0,
    }))

  // Filter by DPR Lead (only if specified in URL params)
  if (params.dprLeadId) {
    sprintsWithHours = sprintsWithHours.filter(sprint => 
      sprint.clients?.dpr_lead_id === params.dprLeadId
    )
  }

  // Filter by health status (using pre-calculated value from database)
  if (params.health && params.health !== 'all') {
    sprintsWithHours = sprintsWithHours.filter(sprint => {
      return getSprintHealth(sprint) === params.health
    })
  }

  // Filter by tracking status (using pre-calculated value from database)
  if (params.tracking && params.tracking !== 'all') {
    sprintsWithHours = sprintsWithHours.filter(sprint =>
      sprint.tracking_status === params.tracking
    )
  }

  // Sort sprints - default to A-Z
  const sortOption = params.sort || 'a-z'
  sprintsWithHours.sort((a, b) => {
    switch (sortOption) {
      case 'ending-soon':
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
      case 'a-z':
        return (a.clients?.name || '').localeCompare(b.clients?.name || '')
      case 'z-a':
        return (b.clients?.name || '').localeCompare(a.clients?.name || '')
      case 'kpi-progress':
        const aProgress = a.kpi_target > 0 ? a.kpi_achieved / a.kpi_target : 0
        const bProgress = b.kpi_target > 0 ? b.kpi_achieved / b.kpi_target : 0
        return bProgress - aProgress
      case 'hours-used':
        return b.hours_used - a.hours_used
      default:
        return (a.clients?.name || '').localeCompare(b.clients?.name || '')
    }
  })

  // Get clients for filter dropdown (all clients when showing all sprints)
  let clientsQuery = supabase
    .from('clients')
    .select('id, name')
    .order('name')
  if (activeOnly) clientsQuery = clientsQuery.eq('is_active', true)
  const { data: clients } = await clientsQuery

  // DPR leads for the filter dropdown (users.is_dpr_lead, maintained in the users table)
  const { data: dprLeads } = await supabase
    .from('users')
    .select('id, name')
    .eq('is_dpr_lead', true)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sprints</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Track sprint progress, KPIs, and time utilization
        </p>
      </div>

      {/* Filters */}
      <SprintFilters 
        clients={clients || []} 
        dprLeads={dprLeads || []}
      />

      {/* Sprint Cards */}
      <SprintCardGrid sprints={sprintsWithHours} />
    </div>
  )
}
