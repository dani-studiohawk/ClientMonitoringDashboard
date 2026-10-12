import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { hoursBarColor, kpiBarColor } from '@/lib/traffic-lights'
import type { ActiveSprintRow } from '@/lib/dashboard/dpr-dashboard'

export function ActiveSprintsTable({ sprints }: { sprints: ActiveSprintRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sprints</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Client</TableHead>
              <TableHead className="w-[80px]">Sprint</TableHead>
              <TableHead className="w-[180px]">KPI Progress</TableHead>
              <TableHead className="w-[180px]">Hours Used</TableHead>
              <TableHead className="w-[180px]">Period</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sprints.map((sprint) => (
              <TableRow key={sprint.id}>
                <TableCell className="w-[200px]">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/dashboard/clients/${sprint.client_id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 truncate"
                    >
                      {sprint.clients?.name || 'Unknown Client'}
                    </Link>
                    {sprint.clients?.niche && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        {sprint.clients.niche}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[80px]">
                  <Link
                    href={`/dashboard/sprints/${sprint.id}`}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Sprint {sprint.sprint_number}
                  </Link>
                </TableCell>
                <TableCell className="w-[180px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {sprint.kpi_achieved.toFixed(0)}/{sprint.kpi_target.toFixed(0)}
                      </span>
                      <span className="font-medium">
                        {sprint.kpiProgress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={sprint.kpiProgress} className={`h-2 ${kpiBarColor(sprint.kpiProgress)}`} />
                  </div>
                </TableCell>
                <TableCell className="w-[180px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {(sprint.hours_used || 0).toFixed(0)}/{(sprint.hours_allocated || 0).toFixed(0)}
                      </span>
                      <span className="font-medium">
                        {sprint.hoursProgress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={sprint.hoursProgress} className={`h-2 ${hoursBarColor(sprint.hoursProgress)}`} />
                  </div>
                </TableCell>
                <TableCell className="w-[180px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {Math.min(sprint.daysElapsed, sprint.totalDays)} of {sprint.totalDays} days
                      </span>
                      <span className="font-medium">
                        {sprint.timeProgress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={sprint.timeProgress} className="h-2 [&>div]:bg-blue-500" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
