// Client Metrics Calculator
// Purpose: Calculate aggregated metrics across all client sprints
// Security: Hides contract values and financial aggregations

import { errorMessage, type DbClient } from '../_shared/db.ts'
import { hasIncompleteTracking } from './tracking-calculator.ts'

interface ClientData {
  id: string
  monthly_hours: number | null
  monthly_rate: number | null
}

interface SprintMetrics {
  sprint_id: string
  client_id: string
  status: string
  tracking_status: string
  hours_used: number
  hours_allocated: number
  sprint_revenue: number
  billable_rate: number | null
  health_status: string
}

interface CalculationResult {
  recordsProcessed: number
  errors: string[]
}

/**
 * Calculate aggregated metrics for a single client
 */
function calculateMetricsForClient(
  client: ClientData,
  sprintMetrics: SprintMetrics[]
): any {
  // Sprint counts by status
  const totalSprints = sprintMetrics.length
  const activeSprints = sprintMetrics.filter(s => s.status === 'active').length
  const completedSprints = sprintMetrics.filter(s => s.status === 'completed').length

  // Hours aggregations
  const totalHoursUsed = sprintMetrics.reduce((sum, s) => sum + (s.hours_used || 0), 0)
  const totalHoursAllocated = sprintMetrics.reduce((sum, s) => sum + (s.hours_allocated || 0), 0)
  const overallUtilizationPercent = totalHoursAllocated > 0
    ? (totalHoursUsed / totalHoursAllocated) * 100
    : 0

  // Financial aggregations (SENSITIVE - only stored in DB)
  const totalContractRevenue = sprintMetrics.reduce((sum, s) => sum + (s.sprint_revenue || 0), 0)

  // Billable contract value (exclude pending sprints)
  const billableContractValue = sprintMetrics
    .filter(s => s.status !== 'pending')
    .reduce((sum, s) => sum + (s.sprint_revenue || 0), 0)

  // Weighted average billable rate (by hours)
  const totalBillableAmount = sprintMetrics.reduce((sum, s) => {
    if (s.billable_rate && s.hours_used > 0) {
      return sum + (s.billable_rate * s.hours_used)
    }
    return sum
  }, 0)
  const avgBillableRate = totalHoursUsed > 0 ? totalBillableAmount / totalHoursUsed : null

  // Risk indicators
  const atRiskSprintCount = sprintMetrics.filter(s => s.health_status === 'at-risk').length
  const behindSprintCount = sprintMetrics.filter(s => s.health_status === 'behind').length

  // Tracking status flag (only for active sprints)
  const hasIncompleteTrackingFlag = hasIncompleteTracking(sprintMetrics)

  return {
    total_sprints: totalSprints,
    active_sprints: activeSprints,
    completed_sprints: completedSprints,
    total_hours_used: Math.round(totalHoursUsed * 10) / 10,
    total_hours_allocated: Math.round(totalHoursAllocated * 10) / 10,
    overall_utilization_percent: Math.round(overallUtilizationPercent * 10) / 10,
    total_contract_revenue: Math.round(totalContractRevenue * 100) / 100,
    billable_contract_value: Math.round(billableContractValue * 100) / 100,
    avg_billable_rate: avgBillableRate ? Math.round(avgBillableRate * 100) / 100 : null,
    at_risk_sprint_count: atRiskSprintCount,
    behind_sprint_count: behindSprintCount,
    has_incomplete_tracking: hasIncompleteTrackingFlag,
    metrics_last_calculated_at: new Date().toISOString(),
  }
}

/**
 * Main function: Calculate metrics for all clients
 */
export async function calculateClientMetrics(
  supabase: DbClient
): Promise<CalculationResult> {
  const errors: string[] = []
  let recordsProcessed = 0

  try {
    // Fetch all active clients
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, monthly_hours, monthly_rate')
      .eq('is_active', true)

    if (fetchError) {
      throw new Error(`Failed to fetch clients: ${fetchError.message}`)
    }

    if (!clients || clients.length === 0) {
      console.log('[client-calculator] No active clients to process')
      return { recordsProcessed: 0, errors: [] }
    }

    console.log(`[client-calculator] Processing ${clients.length} clients...`)

    // Fetch all sprint metrics in one query (we just calculated these in sprint-calculator!)
    const { data: allSprintMetrics, error: sprintsError } = await supabase
      .from('sprints')
      .select(`
        id,
        client_id,
        status,
        tracking_status,
        hours_used,
        hours_allocated,
        sprint_revenue,
        billable_rate,
        health_status
      `)

    if (sprintsError) {
      throw new Error(`Failed to fetch sprint metrics: ${sprintsError.message}`)
    }

    // Group sprints by client_id
    const sprintsByClient = new Map<string, SprintMetrics[]>()
    if (allSprintMetrics) {
      allSprintMetrics.forEach((sprint: any) => {
        if (!sprintsByClient.has(sprint.client_id)) {
          sprintsByClient.set(sprint.client_id, [])
        }
        sprintsByClient.get(sprint.client_id)!.push({
          sprint_id: sprint.id,
          client_id: sprint.client_id,
          status: sprint.status,
          tracking_status: sprint.tracking_status || 'pending',
          hours_used: sprint.hours_used || 0,
          hours_allocated: sprint.hours_allocated || 0,
          sprint_revenue: sprint.sprint_revenue || 0,
          billable_rate: sprint.billable_rate,
          health_status: sprint.health_status || 'on-track',
        })
      })
    }

    // Process each client
    for (const client of clients) {
      try {
        const clientSprints = sprintsByClient.get(client.id) || []
        const metrics = calculateMetricsForClient(client as ClientData, clientSprints)

        // Update client record
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            total_sprints: metrics.total_sprints,
            active_sprints: metrics.active_sprints,
            completed_sprints: metrics.completed_sprints,
            total_hours_used: metrics.total_hours_used,
            total_hours_allocated: metrics.total_hours_allocated,
            overall_utilization_percent: metrics.overall_utilization_percent,
            total_contract_revenue: metrics.total_contract_revenue,
            billable_contract_value: metrics.billable_contract_value,
            avg_billable_rate: metrics.avg_billable_rate,
            at_risk_sprint_count: metrics.at_risk_sprint_count,
            behind_sprint_count: metrics.behind_sprint_count,
            has_incomplete_tracking: metrics.has_incomplete_tracking,
            metrics_last_calculated_at: metrics.metrics_last_calculated_at,
          })
          .eq('id', client.id)

        if (updateError) {
          errors.push(`Failed to update client ${client.id}: ${updateError.message}`)
        } else {
          recordsProcessed++
        }
      } catch (error) {
        errors.push(`Error processing client ${client.id}: ${errorMessage(error)}`)
      }
    }

    console.log(`[client-calculator] Processed ${recordsProcessed} clients`)
    return { recordsProcessed, errors }
  } catch (error) {
    console.error('[client-calculator] Error:', error)
    errors.push(errorMessage(error))
    return { recordsProcessed, errors }
  }
}
