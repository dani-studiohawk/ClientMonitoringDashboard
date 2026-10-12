'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExternalLink } from 'lucide-react'
import type { ClientWithDprLead } from '@/types'
import { ClientCardGrid } from './client-card'

interface ClientsGroupedProps {
  clients: ClientWithDprLead[]
  groupBy?: 'dpr-lead' | 'region'
  viewMode?: 'cards' | 'table'
}

// Map group names to friendly display names
const groupDisplayNames: Record<string, string> = {
  'Active Campaigns - AU': 'Australia',
  'Active Campaigns - US': 'United States',
  'Active Campaigns - UK': 'United Kingdom',
  'Campaign Starting in Future Dates': 'Campaign Starting in Future Dates',
  'Paused Campaigns': 'Paused Campaigns',
  'Completed Campaigns': 'Completed Campaigns',
  'Refunded Campaigns': 'Refunded Campaigns',
}

// Define a consistent order for groups
const groupOrder = [
  'Active Campaigns - AU',
  'Active Campaigns - US',
  'Campaign Starting in Future Dates',
  'Paused Campaigns',
  'Completed Campaigns',
  'Refunded Campaigns',
]

export function ClientsGrouped({ clients, groupBy = 'region', viewMode = 'cards' }: ClientsGroupedProps) {
  if (clients.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-500">
        No clients found
      </div>
    )
  }

  // If cards view and not grouped, show simple card grid
  if (viewMode === 'cards' && groupBy === 'region') {
    // For cards view, we still want to show groups for better organization
    // But we'll render cards instead of tables
  }

  // Group clients based on groupBy prop
  const groupedClients = clients.reduce((acc, client) => {
    let groupKey: string
    
    if (groupBy === 'region') {
      // Check if client is in a special group (non-active campaigns)
      const specialGroups = [
        'Campaign Starting in Future Dates',
        'Paused Campaigns',
        'Completed Campaigns',
        'Refunded Campaigns'
      ]
      
      const isSpecialGroup = specialGroups.some(sg => 
        client.group_name?.includes(sg)
      )
      
      if (isSpecialGroup) {
        // Use the actual group name for special groups
        groupKey = client.group_name || 'Ungrouped'
      } else if (client.region === 'AU') {
        groupKey = 'Active Campaigns - AU'
      } else if (client.region === 'US') {
        groupKey = 'Active Campaigns - US'
      } else if (client.region === 'UK') {
        groupKey = 'Active Campaigns - UK'
      } else {
        // For clients without region, use group_name as fallback
        groupKey = client.group_name || 'Ungrouped'
      }
    } else {
      // Group by DPR lead (default)
      groupKey = client.dpr_lead?.name || 'Unassigned'
    }
    
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(client)
    return acc
  }, {} as Record<string, ClientWithDprLead[]>)

  // Sort groups based on groupBy type
  const sortedGroups = Object.keys(groupedClients).sort((a, b) => {
    if (groupBy === 'region') {
      // Use predefined order for region groups
      const indexA = groupOrder.indexOf(a)
      const indexB = groupOrder.indexOf(b)
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.localeCompare(b)
    } else {
      // Alphabetical for DPR leads, with "Unassigned" at the end
      if (a === 'Unassigned') return 1
      if (b === 'Unassigned') return -1
      return a.localeCompare(b)
    }
  })

  return (
    <div className="space-y-8">
      {sortedGroups.map((groupKey) => {
        const groupClients = groupedClients[groupKey]
        const isActive = groupBy === 'region' && groupKey.startsWith('Active Campaigns')
        const displayName = groupBy === 'region' ? (groupDisplayNames[groupKey] || groupKey) : groupKey

        return (
          <div key={groupKey} className="space-y-4">
            {/* Header instead of Card */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {displayName}
                  {isActive && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" variant="secondary">
                      Active
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {groupClients.length} client{groupClients.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {/* Content */}
            {viewMode === 'table' ? (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>DPR Lead</TableHead>
                    <TableHead className="text-right">Agency Value</TableHead>
                    <TableHead className="text-right">Monthly Value</TableHead>
                    <TableHead>Contract Type</TableHead>
                    <TableHead>Contract Length</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="hover:underline"
                          >
                            {client.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {client.dpr_lead?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {client.agency_value 
                            ? `$${client.agency_value.toLocaleString()}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {client.monthly_rate 
                            ? `$${client.monthly_rate.toLocaleString()}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {client.campaign_type || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {client.contract_length || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/clients/${client.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </CardContent>
              </Card>
              ) : (
                <ClientCardGrid clients={groupClients} />
              )}
          </div>
        )
      })}
    </div>
  )
}
