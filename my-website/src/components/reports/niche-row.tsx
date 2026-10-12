'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface NicheRowProps {
  niche: {
    niche: string
    totalSprints: number
    kpiHitRate: number
    avgBillableRate: number
    hoursUtilization: number
    totalHours: number
  }
  clients: Array<{
    id: string
    name: string
    is_active: boolean | null
  }>
  sprints: Array<{
    id: string
    sprint_number: number | null
    client_id: string
    kpi_target: number
    kpi_achieved: number
    hours_used: number | null
    hours_allocated: number
    billable_rate: number | null
    clients?: {
      name: string
      dpr_lead_name?: string | null
    }
  }>
}

export function NicheRow({ niche, sprints }: NicheRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)


  return (
    <>
      <tr 
        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <span className="font-medium">{niche.niche}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-center font-semibold">{niche.totalSprints}</td>
        <td className="py-3 px-4 text-center">
          <span className={`font-semibold ${
            niche.kpiHitRate < 80 
              ? 'text-red-600 dark:text-red-400'
              : niche.kpiHitRate < 100
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-green-600 dark:text-green-400'
          }`}>
            {niche.kpiHitRate.toFixed(0)}%
          </span>
        </td>
        <td className="py-3 px-4 text-center">
          {niche.avgBillableRate > 0 ? (
            <span className={`font-semibold ${
              niche.avgBillableRate < 150 
                ? 'text-red-600 dark:text-red-400'
                : niche.avgBillableRate < 190
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-green-600 dark:text-green-400'
            }`}>
              ${niche.avgBillableRate.toFixed(0)}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="py-3 px-4 text-center">
          <span className={`font-semibold ${
            niche.hoursUtilization <= 100 
              ? 'text-green-600 dark:text-green-400'
              : niche.hoursUtilization <= 110
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          }`}>
            {niche.hoursUtilization.toFixed(0)}%
          </span>
        </td>
        <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
          {niche.totalHours.toFixed(0)}
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-gray-50 dark:bg-gray-900/50">
          <td colSpan={6} className="py-4 px-6">
            <div className="overflow-x-auto">
              {sprints.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No completed sprints in this niche</p>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Client</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">DPR Lead</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">KPI</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Hours</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">Billable Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprints.map(sprint => {
                      const kpiProgress = sprint.kpi_target > 0 
                        ? (sprint.kpi_achieved / sprint.kpi_target) * 100 
                        : 0
                      const hoursProgress = sprint.hours_allocated > 0
                        ? ((sprint.hours_used || 0) / sprint.hours_allocated) * 100
                        : 0

                      return (
                        <tr key={sprint.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/clients/${sprint.client_id}`}
                                className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {sprint.clients?.name || 'Unknown Client'}
                              </Link>
                              <Link
                                href={`/dashboard/sprints/${sprint.id}`}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                              >
                                Sprint {sprint.sprint_number}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {sprint.clients?.dpr_lead_name || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                <span>{sprint.kpi_achieved}/{sprint.kpi_target}</span>
                                <span className={`font-semibold ${
                                  kpiProgress >= 100 
                                    ? 'text-green-600 dark:text-green-400'
                                    : kpiProgress >= 80
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {kpiProgress.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    kpiProgress >= 100 
                                      ? 'bg-green-600'
                                      : kpiProgress >= 80
                                        ? 'bg-amber-500'
                                        : 'bg-red-600'
                                  }`}
                                  style={{ width: `${Math.min(kpiProgress, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                <span>{(sprint.hours_used || 0).toFixed(0)}/{sprint.hours_allocated.toFixed(0)}</span>
                                <span className={`font-semibold ${
                                  hoursProgress <= 100 
                                    ? 'text-green-600 dark:text-green-400'
                                    : hoursProgress <= 110
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {hoursProgress.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    hoursProgress <= 100 
                                      ? 'bg-green-600'
                                      : hoursProgress <= 110
                                        ? 'bg-amber-500'
                                        : 'bg-red-600'
                                  }`}
                                  style={{ width: `${Math.min(hoursProgress, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {sprint.billable_rate ? (
                              <span className={`font-semibold ${
                                sprint.billable_rate >= 190 
                                  ? 'text-green-600 dark:text-green-400'
                                  : sprint.billable_rate >= 150
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-red-600 dark:text-red-400'
                              }`}>
                                ${sprint.billable_rate.toFixed(0)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
