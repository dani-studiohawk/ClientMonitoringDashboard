import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DashboardClient } from '@/lib/dashboard/dpr-dashboard'

function ClientRows({ clients }: { clients: DashboardClient[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client Name</TableHead>
          <TableHead>Niche</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Monthly Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell>
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {client.name}
              </Link>
            </TableCell>
            <TableCell>
              {client.niche ? (
                <Badge variant="secondary" className="text-xs">
                  {client.niche}
                </Badge>
              ) : '-'}
            </TableCell>
            <TableCell>{client.region || '-'}</TableCell>
            <TableCell>${client.monthly_rate?.toLocaleString() || 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface ClientsTableProps {
  activeClients: DashboardClient[]
  inactiveClients: DashboardClient[]
}

export function ClientsTable({ activeClients, inactiveClients }: ClientsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Managed Clients</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active">
              Active Clients ({activeClients.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed Clients ({inactiveClients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ClientRows clients={activeClients} />
          </TabsContent>

          <TabsContent value="completed">
            <ClientRows clients={inactiveClients} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
