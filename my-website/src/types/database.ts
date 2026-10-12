import type { Database, Tables } from './supabase'

// Tracking status for sprints (database enum tracking_status_type):
//   fully_tracked  KPI and hours data
//   kpi_only       KPI but no hours
//   hours_only     hours but no KPI
//   untracked      neither
//   partial        started before Clockify tracking (Feb 2025), hours incomplete
//   legacy         completed sprint with no data (historical)
//   pending        future sprint, not yet started
export type TrackingStatus = Database['public']['Enums']['tracking_status_type']

// Row types come from the generated schema (types/supabase.ts). Regenerate it
// with `npx supabase gen types typescript --project-id ylnrkfpchrzvuhqrnwco
// --schema public > src/types/supabase.ts` after a schema change.
export type Client = Tables<'clients'>
export type Sprint = Tables<'sprints'>

/** The sprint columns the Clients page selects for each client. */
export type ClientSprintSummary = Pick<
  Sprint,
  'id' | 'name' | 'sprint_number' | 'start_date' | 'end_date' | 'kpi_target' | 'kpi_achieved' | 'status' | 'health_status' | 'hours_used'
>

export interface ClientWithDprLead extends Client {
  dpr_lead: { name: string } | null
  sprints?: ClientSprintSummary[]
}
