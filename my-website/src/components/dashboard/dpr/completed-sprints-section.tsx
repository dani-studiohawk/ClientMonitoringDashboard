import Link from 'next/link'
import { format } from 'date-fns'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { billableRateColor, hoursBarColor, kpiBarColor } from '@/lib/traffic-lights'
import { hoursProgress, kpiProgress, type DashboardSprint } from '@/lib/dashboard/dpr-dashboard'
import type { PerformanceBucket } from '@/lib/sprint-metrics'

interface CompletedSprintsSectionProps {
  sprints: DashboardSprint[]
  performance: Record<PerformanceBucket, DashboardSprint[]>
  sprintsByNiche: [string, number][]
}

export function CompletedSprintsSection({ sprints, performance, sprintsByNiche }: CompletedSprintsSectionProps) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Completed Sprints ({sprints.length})
              </span>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {sprints.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Sprint Performance Summary */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Sprint Performance
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total Completed:</span>
                        <span className="font-semibold">{sprints.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 dark:text-green-400">✓ Met KPI, Within Hours:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">{performance.metWithinHours.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-600 dark:text-amber-400">✓ Met KPI, Over Hours:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{performance.metAboveHours.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-600 dark:text-amber-400">✗ Missed KPI, Within Hours:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{performance.missedWithinHours.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-red-600 dark:text-red-400">✗ Missed KPI, Over Hours:</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{performance.missedAboveHours.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sprints by Niche */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Sprints by Niche
                    </div>
                    <div className="space-y-2 text-sm">
                      {sprintsByNiche.map(([niche, count]) => (
                        <div key={niche} className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">{niche}:</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Sprint</TableHead>
                      <TableHead>KPI Progress</TableHead>
                      <TableHead>Hours Used</TableHead>
                      <TableHead>Billable Rate</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sprints.map((sprint) => {
                      const kpi = kpiProgress(sprint)
                      const hours = hoursProgress(sprint)
                      const rate = sprint.billable_rate || 0

                      return (
                        <TableRow key={sprint.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <Link
                                href={`/dashboard/clients/${sprint.client_id}`}
                                className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {sprint.clients?.name || 'Unknown Client'}
                              </Link>
                              {sprint.clients?.niche && (
                                <div>
                                  <Badge variant="secondary" className="text-xs">
                                    {sprint.clients.niche}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/dashboard/sprints/${sprint.id}`}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Sprint {sprint.sprint_number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {sprint.kpi_achieved.toFixed(1)} / {sprint.kpi_target.toFixed(1)}
                                </span>
                                <span className="font-medium">
                                  {kpi.toFixed(0)}%
                                </span>
                              </div>
                              <Progress value={kpi} className={`h-2 ${kpiBarColor(kpi)}`} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {(sprint.hours_used || 0).toFixed(1)} / {(sprint.hours_allocated || 0).toFixed(1)}
                                </span>
                                <span className="font-medium">
                                  {hours.toFixed(0)}%
                                </span>
                              </div>
                              <Progress value={hours} className={`h-2 ${hoursBarColor(hours)}`} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${billableRateColor(rate)}`}>
                              ${rate.toFixed(0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(sprint.end_date), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No completed sprints with full tracking available.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
