import Link from 'next/link'
import { Users } from 'lucide-react'
import { RemovedClientsAlert } from '@/components/removed-clients/removed-clients-alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AdminLeadListProps {
  adminEmail: string
  leads: { id: string; name: string; email: string }[]
  removedPendingCount?: number
}

/** Admin landing page: pick a DPR lead to view their dashboard. */
export function AdminLeadList({ adminEmail, leads, removedPendingCount = 0 }: AdminLeadListProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {adminEmail}
            </p>
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select a DPR Lead to view their performance dashboard
        </p>
      </div>

      <RemovedClientsAlert count={removedPendingCount} />

      <Card>
        <CardHeader>
          <CardTitle>DPR Lead Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DPR Lead</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-gray-500">{lead.email}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard?dpr=${lead.id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View Report →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
