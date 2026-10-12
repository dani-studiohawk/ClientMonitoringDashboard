'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ChevronDown, ChevronUp, Archive } from 'lucide-react'
import { format } from 'date-fns'

interface LegacySprint {
  id: string
  client_id: string
  name: string
  sprint_number: number | null
  start_date: string
  end_date: string
  kpi_target: number
  kpi_achieved: number
  status: string | null
  hours_used: number | null
  hours_allocated: number | null
  tracking_status?: string | null
  clients?: {
    id: string
    name: string
  } | null
}

interface LegacySprintsSectionProps {
  sprints: LegacySprint[]
}

export function LegacySprintsSection({ sprints }: LegacySprintsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (sprints.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-gray-500" />
            Legacy Untracked Sprints ({sprints.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Completed sprints from early 2025 with no KPI or hours tracking data
        </p>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Sprint</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sprints.map((sprint) => (
                  <TableRow key={sprint.id}>
                    <TableCell className="font-medium">
                      {sprint.clients?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>Sprint {sprint.sprint_number || '?'}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(sprint.start_date), 'MMM d, yyyy')} -{' '}
                      {format(new Date(sprint.end_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800">
                        <Archive className="h-3 w-3 mr-1" />
                        Legacy
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/dashboard/sprints/${sprint.id}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        View Details
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
