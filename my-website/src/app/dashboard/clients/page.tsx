import { createClient } from '@/lib/supabase/server'
import { ClientsGrouped } from '@/components/clients/clients-grouped'
import { ClientFilters } from '@/components/clients/client-filters'

interface SearchParams {
  region?: string
  status?: string
  search?: string
  groupBy?: 'dpr-lead' | 'region'
  view?: 'cards' | 'table'
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  // Build query with user join for DPR lead name and current sprint data
  let query = supabase
    .from('clients')
    .select(`
      *,
      dpr_lead:users!clients_dpr_lead_id_fkey(name),
      sprints(
        id,
        name,
        sprint_number,
        start_date,
        end_date,
        kpi_target,
        kpi_achieved,
        status,
        health_status,
        hours_used
      )
    `)
    .order('name', { ascending: true })

  // Apply filters
  if (params.region) {
    query = query.eq('region', params.region)
  }
  // Default to active clients if no status specified
  if (params.status === 'inactive') {
    query = query.eq('is_active', false)
  } else if (params.status === 'all') {
    // Show all clients - no filter
  } else {
    // Default to active (when status is 'active' or undefined)
    query = query.eq('is_active', true)
  }
  if (params.search) {
    query = query.ilike('name', `%${params.search}%`)
  }

  const { data: clients, error } = await query

  if (error) {
    console.error('Error fetching clients:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and view all client accounts grouped by status
        </p>
      </div>

      <ClientFilters />

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {clients?.length || 0} clients found
      </div>

      <ClientsGrouped 
        clients={clients || []} 
        groupBy={params.groupBy || 'region'} 
        viewMode={params.view || 'cards'}
      />
    </div>
  )
}
