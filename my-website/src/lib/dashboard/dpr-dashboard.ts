// Data for a DPR lead's dashboard: one fetch, then a pure calculation step
// (buildDprDashboard) that the page and tests share.
import { differenceInDays } from 'date-fns'
import type { createClient } from '@/lib/supabase/server'
import { getSprintHealth, HEALTH_PRIORITY, withSprintDefaults, type SprintHealth } from '@/lib/sprint-health'
import { averageBillableRate, groupByPerformance, isAnalysable } from '@/lib/sprint-metrics'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export async function fetchDprDashboardData(supabase: ServerClient, dprLeadId: string) {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, agency_value, monthly_rate, is_active, region, niche')
    .eq('dpr_lead_id', dprLeadId)
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  const clientIds = clients?.map(c => c.id) || []

  const { data: sprintsRaw } = await supabase
    .from('sprints')
    .select(`
      id,
      client_id,
      name,
      sprint_number,
      start_date,
      end_date,
      kpi_target,
      kpi_achieved,
      status,
      hours_used,
      hours_allocated,
      billable_rate,
      health_status,
      tracking_status,
      clients!inner (
        id,
        name,
        niche
      )
    `)
    .in('client_id', clientIds.length > 0 ? clientIds : [''])
    .order('start_date', { ascending: false })

  return { clients: clients ?? [], sprints: withSprintDefaults(sprintsRaw) }
}

export type DashboardData = Awaited<ReturnType<typeof fetchDprDashboardData>>
export type DashboardClient = DashboardData['clients'][number]
export type DashboardSprint = DashboardData['sprints'][number]

export interface ActiveSprintRow extends DashboardSprint {
  health: SprintHealth | null
  kpiProgress: number
  hoursProgress: number
  timeProgress: number
  daysElapsed: number
  totalDays: number
}

export function kpiProgress(sprint: Pick<DashboardSprint, 'kpi_target' | 'kpi_achieved'>): number {
  return sprint.kpi_target > 0 ? (sprint.kpi_achieved / sprint.kpi_target) * 100 : 0
}

export function hoursProgress(sprint: Pick<DashboardSprint, 'hours_used' | 'hours_allocated'>): number {
  return sprint.hours_allocated > 0 ? ((sprint.hours_used || 0) / sprint.hours_allocated) * 100 : 0
}

export function buildDprDashboard({ clients, sprints }: DashboardData, today = new Date()) {
  const activeClients = clients.filter(c => c.is_active)
  const inactiveClients = clients.filter(c => !c.is_active)
  const activeSprintList = sprints.filter(s => s.status === 'active')
  const legacySprints = sprints.filter(s => s.tracking_status === 'legacy')

  // Only completed sprints with full tracking data are analysed
  const completedSprints = sprints
    .filter(isAnalysable)
    .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())

  const niches: Record<string, number> = {}
  for (const sprint of completedSprints) {
    const niche = sprint.clients?.niche || 'Unknown'
    niches[niche] = (niches[niche] || 0) + 1
  }
  const sprintsByNiche = Object.entries(niches).sort(([, a], [, b]) => b - a)

  const healthCounts: Partial<Record<SprintHealth, number>> = {}
  for (const sprint of activeSprintList) {
    const health = getSprintHealth(sprint, today)
    if (health) healthCounts[health] = (healthCounts[health] || 0) + 1
  }

  const rank = (h: SprintHealth | null) => (h ? HEALTH_PRIORITY[h] : 7)
  const activeSprints: ActiveSprintRow[] = activeSprintList
    .map(sprint => {
      const startDate = new Date(sprint.start_date)
      const totalDays = differenceInDays(new Date(sprint.end_date), startDate)
      const daysElapsed = sprint.status === 'completed'
        ? totalDays
        : Math.max(0, Math.min(differenceInDays(today, startDate), totalDays))
      return {
        ...sprint,
        health: getSprintHealth(sprint, today),
        kpiProgress: kpiProgress(sprint),
        hoursProgress: hoursProgress(sprint),
        timeProgress: totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0,
        daysElapsed,
        totalDays,
      }
    })
    .sort((a, b) => rank(a.health) - rank(b.health))

  return {
    activeClients,
    inactiveClients,
    activeSprints,
    legacySprints,
    completedSprints,
    avgBillableRate: averageBillableRate(completedSprints),
    performance: groupByPerformance(completedSprints),
    sprintsByNiche,
    healthCounts,
  }
}

export type DprDashboardModel = ReturnType<typeof buildDprDashboard>
