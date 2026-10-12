'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NicheRow } from '@/components/reports/niche-row'
import type { PersonTimeSummary } from '@/lib/person-time'

type NicheRowProps = React.ComponentProps<typeof NicheRow>

export interface DprMetric {
  id: string
  name: string
  activeClientsCount: number
  totalClientsCount: number
  activeSprintsCount: number
  completedSprintsCount: number
  avgBillableRate: number
  avgKpiPerformance: number
  metKpiWithinHours: number
  metKpiAboveHours: number
  missedKpiWithinHours: number
  missedKpiAboveHours: number
}

export interface TimeTrackingData {
  tasks: {
    category: string
    dpr_data: { dpr_id: string; avg_hours: number; sprint_count: number }[]
  }[]
}

interface ReportsTabsProps {
  dprMetrics: DprMetric[]
  nicheStats: NicheRowProps['niche'][]
  clients: (NicheRowProps['clients'][number] & { niche: string | null })[]
  sprintsWithLeads: (NicheRowProps['sprints'][number] & {
    status: string | null
    tracking_status: string | null
    clients: { name: string; niche: string | null; dpr_lead_name: string | null }
  })[]
  timeTrackingData: TimeTrackingData
  personTime: Record<string, PersonTimeSummary>
}

export function ReportsTabs({ dprMetrics, nicheStats, clients, sprintsWithLeads, timeTrackingData, personTime }: ReportsTabsProps) {
  const [activeTab, setActiveTab] = useState<'dpr' | 'niche' | 'time'>('dpr')

  return (
    <>
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dpr')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'dpr'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            DPR Performance
          </button>
          <button
            onClick={() => setActiveTab('niche')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'niche'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Niche Analytics
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'time'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Time Tracking
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dpr' && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Comparing {dprMetrics.length} DPR leads based on completed fully tracked sprints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm">DPR Lead</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Active Clients</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Active Sprints</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Completed Sprints</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Avg KPI Performance</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Avg Billable Rate</th>
                      <th className="text-center py-3 px-4 font-medium text-sm text-green-600">✓ Met KPI, Within Hours</th>
                      <th className="text-center py-3 px-4 font-medium text-sm text-amber-600">✓ Met KPI, Over Hours</th>
                      <th className="text-center py-3 px-4 font-medium text-sm text-amber-600">✗ Missed KPI, Within Hours</th>
                      <th className="text-center py-3 px-4 font-medium text-sm text-red-600">✗ Missed KPI, Over Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dprMetrics.map((metric) => (
                      <tr key={metric.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4 font-medium">{metric.name}</td>
                        <td className="py-3 px-4 text-center">{metric.activeClientsCount}</td>
                        <td className="py-3 px-4 text-center">{metric.activeSprintsCount}</td>
                        <td className="py-3 px-4 text-center font-semibold">{metric.completedSprintsCount}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-semibold ${
                            metric.avgKpiPerformance >= 80 
                              ? 'text-green-600 dark:text-green-400'
                              : metric.avgKpiPerformance >= 60
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}>
                            {metric.avgKpiPerformance.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {metric.avgBillableRate > 0 ? (
                            <span className={`font-semibold ${
                              metric.avgBillableRate >= 190 
                                ? 'text-green-600 dark:text-green-400'
                                : metric.avgBillableRate >= 150
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400'
                            }`}>
                              ${metric.avgBillableRate.toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                          {metric.metKpiWithinHours}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-semibold">
                          {metric.metKpiAboveHours}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-semibold">
                          {metric.missedKpiWithinHours}
                        </td>
                        <td className="py-3 px-4 text-center text-red-600 dark:text-red-400 font-semibold">
                          {metric.missedKpiAboveHours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'niche' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Performance by Niche
          </h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Niches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{nicheStats.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top Performing Niche</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {nicheStats.length > 0 
                    ? nicheStats.reduce((max, n) => n.kpiHitRate > max.kpiHitRate ? n : max).niche
                    : '-'}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {nicheStats.length > 0 
                    ? `${nicheStats.reduce((max, n) => n.kpiHitRate > max.kpiHitRate ? n : max).kpiHitRate.toFixed(0)}% KPI hit rate`
                    : '-'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Highest Billable Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {nicheStats.length > 0 
                    ? nicheStats.reduce((max, n) => n.avgBillableRate > max.avgBillableRate ? n : max).niche
                    : '-'}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {nicheStats.length > 0 
                    ? `$${nicheStats.reduce((max, n) => n.avgBillableRate > max.avgBillableRate ? n : max).avgBillableRate.toFixed(0)}/hr`
                    : '$-Infinity/hr'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Most Active Niche</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {nicheStats.length > 0 ? nicheStats[0].niche : '-'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {nicheStats.length > 0 ? `${nicheStats[0].totalSprints} completed sprints` : '0 completed sprints'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Niche Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Niche Comparison</CardTitle>
              <CardDescription>Performance metrics across all niches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm">Niche</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Completed Sprints</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">KPI Hit Rate</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Avg Billable Rate</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Hours Utilization</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nicheStats.map((niche) => (
                      <NicheRow
                        key={niche.niche}
                        niche={niche}
                        clients={clients?.filter(c => c.niche === niche.niche) || []}
                        sprints={sprintsWithLeads?.filter(s => 
                          s.status === 'completed' && 
                          s.tracking_status === 'fully_tracked' && 
                          s.clients?.niche === niche.niche
                        ).sort((a, b) => {
                          const clientCompare = a.clients.name.localeCompare(b.clients.name)
                          if (clientCompare !== 0) return clientCompare
                          return (a.sprint_number || 0) - (b.sprint_number || 0)
                        }) || []}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'time' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Task Time Analysis by DPR Lead
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Average Hours per Task Category</CardTitle>
              <CardDescription>Each lead&apos;s own logged time per task, averaged over the completed sprints where they logged more than 5 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-6 font-semibold text-sm sticky left-0 bg-white dark:bg-gray-900 min-w-[200px]">Task Category</th>
                      {dprMetrics.map((dpr, idx) => (
                        <th key={dpr.id} className={`text-center py-4 px-6 font-semibold text-sm w-[120px] ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>
                          {dpr.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeTrackingData.tasks?.map((task) => (
                      <tr key={task.category} className="border-b border-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                        <td className="py-4 px-6 font-medium text-sm sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-200">
                          {task.category || 'Uncategorized'}
                        </td>
                        {dprMetrics.map((dpr, idx) => {
                          const dprData = task.dpr_data.find((d) => d.dpr_id === dpr.id)
                          const avgHours = dprData?.avg_hours || 0
                          
                          return (
                            <td key={dpr.id} className={`py-4 px-6 text-center text-base ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>
                              {avgHours > 0 ? (
                                <div className="text-gray-900 dark:text-white">
                                  {avgHours.toFixed(1)}h
                                </div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Time Distribution Summary</CardTitle>
              <CardDescription>Each lead&apos;s own logged time: average hours per sprint and top tasks, across the completed sprints where they logged more than 5 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dprMetrics.map((dpr) => {
                  // The lead's own logged time, averaged over the sprints they worked on
                  const summary = personTime[dpr.id]
                  const dprTotalHours = summary?.avgHoursPerSprint ?? 0
                  const topTasks = summary?.topTasks ?? []

                  return (
                    <div key={dpr.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-semibold">{dpr.name}</h3>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {dprTotalHours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium uppercase">Top Tasks</p>
                        {topTasks.map((task, idx) => (
                          <div key={task.category} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {idx + 1}. {task.category}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {task.hours.toFixed(1)}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
