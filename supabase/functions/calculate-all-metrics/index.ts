// Edge Function: calculate-all-metrics
// Purpose: Orchestrates all metric calculations and stores results in database
// Trigger: Cron (twice daily) or manual API call
// Security: Hides business logic and raw financial data from client

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { calculateSprintMetrics } from './sprint-calculator.ts'
import { calculateClientMetrics } from './client-calculator.ts'
import { getServiceKey, requireCronSecret } from '../_shared/auth.ts'
import { createDbClient, errorMessage } from '../_shared/db.ts'

serve(async (req) => {
  const denied = requireCronSecret(req)
  if (denied) return denied

  try {
    const body = await req.json().catch(() => ({}))
    // (Older callers also send skipReports; the report step was removed, so it is ignored.)
    const { trigger = 'manual' } = body

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = getServiceKey()!
    const supabase = createDbClient(supabaseUrl, supabaseServiceKey)

    console.log(`[calculate-all-metrics] Starting calculation (trigger: ${trigger})`)

    // Log start to sync_logs
    const { data: logEntry, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        source: 'calculate-metrics',
        sync_start: new Date().toISOString(),
        status: 'running',
        records_synced: 0,
      })
      .select()
      .single()

    if (logError) {
      console.error('[calculate-all-metrics] Failed to create sync log:', logError)
    }

    const startTime = Date.now()
    let totalRecords = 0
    const errors: string[] = []

    // ========================================================================
    // STEP 1: Calculate Sprint Metrics
    // ========================================================================
    try {
      console.log('[calculate-all-metrics] Step 1: Calculating sprint metrics...')
      const sprintResult = await calculateSprintMetrics(supabase)
      totalRecords += sprintResult.recordsProcessed
      console.log(`[calculate-all-metrics] ✓ Sprint metrics: ${sprintResult.recordsProcessed} sprints processed`)

      if (sprintResult.errors.length > 0) {
        errors.push(...sprintResult.errors)
      }
    } catch (error) {
      const errorMsg = `Sprint calculation failed: ${errorMessage(error)}`
      console.error(`[calculate-all-metrics] ✗ ${errorMsg}`)
      errors.push(errorMsg)
    }

    // ========================================================================
    // STEP 2: Calculate Client Metrics
    // ========================================================================
    try {
      console.log('[calculate-all-metrics] Step 2: Calculating client metrics...')
      const clientResult = await calculateClientMetrics(supabase)
      totalRecords += clientResult.recordsProcessed
      console.log(`[calculate-all-metrics] ✓ Client metrics: ${clientResult.recordsProcessed} clients processed`)

      if (clientResult.errors.length > 0) {
        errors.push(...clientResult.errors)
      }
    } catch (error) {
      const errorMsg = `Client calculation failed: ${errorMessage(error)}`
      console.error(`[calculate-all-metrics] ✗ ${errorMsg}`)
      errors.push(errorMsg)
    }

    // ========================================================================
    // FINISH: Update sync log
    // ========================================================================
    const duration = Date.now() - startTime
    const finalStatus = errors.length > 0 ? 'completed_with_errors' : 'success'

    if (logEntry) {
      await supabase
        .from('sync_logs')
        .update({
          sync_end: new Date().toISOString(),
          status: finalStatus,
          records_synced: totalRecords,
          error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', logEntry.id)
    }

    console.log(`[calculate-all-metrics] Completed in ${duration}ms`)
    console.log(`[calculate-all-metrics] Total records: ${totalRecords}`)
    console.log(`[calculate-all-metrics] Status: ${finalStatus}`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        totalRecords,
        duration: `${duration}ms`,
        errors: errors.length > 0 ? errors : undefined,
        trigger,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[calculate-all-metrics] Fatal error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage(error),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
