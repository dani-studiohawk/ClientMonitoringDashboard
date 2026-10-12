// Sprint Metrics Calculator
// Purpose: Calculate all sprint-level metrics and store in sprints table
// Security: Hides billable rate calculations and business logic

import { errorMessage, type DbClient } from '../_shared/db.ts'
import { calculateMetricsForSprint, type SprintData } from './sprint-formulas.ts'

interface CalculationResult {
  recordsProcessed: number
  errors: string[]
}

/**
 * Main function: Calculate metrics for all sprints
 */
export async function calculateSprintMetrics(
  supabase: DbClient
): Promise<CalculationResult> {
  const errors: string[] = []
  let recordsProcessed = 0

  try {
    // Fetch active sprints + completed sprints from last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: sprints, error: fetchError } = await supabase
      .from('sprints')
      .select(`
        id,
        client_id,
        start_date,
        end_date,
        kpi_target,
        kpi_achieved,
        monthly_rate,
        status,
        clients (
          monthly_hours,
          monthly_rate,
          is_quarterly_rate
        )
      `)
      .or(`status.eq.active,status.eq.pending,and(status.eq.completed,end_date.gte.${ninetyDaysAgo.toISOString().split('T')[0]})`)

    if (fetchError) {
      throw new Error(`Failed to fetch sprints: ${fetchError.message}`)
    }

    if (!sprints || sprints.length === 0) {
      console.log('[sprint-calculator] No sprints to process')
      return { recordsProcessed: 0, errors: [] }
    }

    console.log(`[sprint-calculator] Processing ${sprints.length} sprints...`)

    // Get sprint IDs for batch hour lookup
    const sprintIds = sprints.map(s => s.id)

    // Fetch hours for all sprints in one query
    const { data: hoursData, error: hoursError } = await supabase
      .rpc('get_sprint_hours', { sprint_ids: sprintIds })

    if (hoursError) {
      console.error('[sprint-calculator] Warning: Failed to fetch hours via RPC, will calculate individually')
    }

    // Create hours lookup map
    const hoursMap = new Map<string, number>()
    if (hoursData) {
      hoursData.forEach((row: any) => {
        hoursMap.set(row.sprint_id, row.total_hours || 0)
      })
    }

    // Process sprints in batches of 100
    const BATCH_SIZE = 100
    for (let i = 0; i < sprints.length; i += BATCH_SIZE) {
      const batch = sprints.slice(i, i + BATCH_SIZE)

      const updates = batch.map(sprint => {
        const hoursUsed = hoursMap.get(sprint.id) || 0
        const metrics = calculateMetricsForSprint(sprint as unknown as SprintData, hoursUsed)

        return {
          id: sprint.id,
          ...metrics,
        }
      })

      // Upsert metrics for this batch
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('sprints')
          .update({
            hours_used: update.hours_used,
            hours_allocated: update.hours_allocated,
            hours_utilization_percent: update.hours_utilization_percent,
            billable_rate: update.billable_rate,
            sprint_revenue: update.sprint_revenue,
            kpi_progress_percent: update.kpi_progress_percent,
            kpi_efficiency: update.kpi_efficiency,
            time_elapsed_percent: update.time_elapsed_percent,
            days_remaining: update.days_remaining,
            health_status: update.health_status,
            tracking_status: update.tracking_status,
            metrics_last_calculated_at: update.metrics_last_calculated_at,
          })
          .eq('id', update.id)

        if (updateError) {
          errors.push(`Failed to update sprint ${update.id}: ${updateError.message}`)
        } else {
          recordsProcessed++
        }
      }

      console.log(`[sprint-calculator] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sprints.length / BATCH_SIZE)}`)
    }

    return { recordsProcessed, errors }
  } catch (error) {
    console.error('[sprint-calculator] Error:', error)
    errors.push(errorMessage(error))
    return { recordsProcessed, errors }
  }
}
