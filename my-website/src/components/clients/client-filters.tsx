'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Search, X, LayoutGrid, Table } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'

export function ClientFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString())
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key)
        } else if (key === 'status' && value === 'all') {
          // Keep 'all' for status to explicitly show all clients
          newParams.set(key, value)
        } else if (value === 'all') {
          newParams.delete(key)
        } else {
          newParams.set(key, value)
        }
      })

      return newParams.toString()
    },
    [searchParams]
  )

  const handleSearch = () => {
    startTransition(() => {
      const queryString = createQueryString({ search })
      router.push(`/dashboard/clients?${queryString}`)
    })
  }

  const handleRegionChange = (value: string) => {
    startTransition(() => {
      const queryString = createQueryString({ region: value })
      router.push(`/dashboard/clients?${queryString}`)
    })
  }

  const handleGroupByChange = (value: string) => {
    startTransition(() => {
      const queryString = createQueryString({ groupBy: value })
      router.push(`/dashboard/clients?${queryString}`)
    })
  }

  // Default to active only (checked) - only false if explicitly set to 'all'
  const isActiveOnly = searchParams.get('status') !== 'all'
  
  const handleActiveOnlyChange = (checked: boolean) => {
    startTransition(() => {
      // When checked (true), show active only (default, no param needed)
      // When unchecked (false), show all clients
      const queryString = createQueryString({ status: checked ? null : 'all' })
      router.push(`/dashboard/clients?${queryString}`)
    })
  }

  const clearFilters = () => {
    setSearch('')
    startTransition(() => {
      router.push('/dashboard/clients')
    })
  }

  const hasFilters = searchParams.toString().length > 0

  // Default to cards view
  const currentView = searchParams.get('view') || 'cards'

  const handleViewChange = (view: 'cards' | 'table') => {
    startTransition(() => {
      const queryString = createQueryString({ view: view === 'cards' ? null : view })
      router.push(`/dashboard/clients?${queryString}`)
    })
  }

  return (
    <div className="space-y-4">
      {/* Top Row - Active Toggle and View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="active-only"
            checked={isActiveOnly}
            onCheckedChange={handleActiveOnlyChange}
          />
          <Label htmlFor="active-only">Show active clients only</Label>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant={currentView === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('cards')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </Button>
          <Button
            variant={currentView === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('table')}
            className="gap-2"
          >
            <Table className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-1 gap-2 min-w-[200px]">
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-sm"
          />
          <Button onClick={handleSearch} disabled={isPending} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={searchParams.get('region') || 'all'}
          onValueChange={handleRegionChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem value="AU">Australia</SelectItem>
            <SelectItem value="US">United States</SelectItem>
            <SelectItem value="UK">United Kingdom</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get('groupBy') || 'region'}
          onValueChange={handleGroupByChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Group By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dpr-lead">Group by DPR Lead</SelectItem>
            <SelectItem value="region">Group by Region</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} disabled={isPending}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
