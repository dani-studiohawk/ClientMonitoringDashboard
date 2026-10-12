import { CheckCircle2, Target, Clock, AlertTriangle, Calendar, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { TrackingStatus } from '@/types/database'

interface TrackingStatusConfig {
  label: string
  color: string
  icon: React.ReactNode
  description: string
}

const trackingStatusConfig: Record<TrackingStatus, TrackingStatusConfig> = {
  fully_tracked: {
    label: 'Tracked',
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    icon: <CheckCircle2 className="h-3 w-3" />,
    description: 'Has both KPI and hours data',
  },
  kpi_only: {
    label: 'KPI Only',
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    icon: <Target className="h-3 w-3" />,
    description: 'Has KPI but no hours tracked',
  },
  hours_only: {
    label: 'Hours Only',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    icon: <Clock className="h-3 w-3" />,
    description: 'Has hours but no KPI data',
  },
  untracked: {
    label: 'Untracked',
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    icon: <AlertTriangle className="h-3 w-3" />,
    description: 'Neither KPI nor hours tracked',
  },
  partial: {
    label: 'Partial',
    color: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
    icon: <Clock className="h-3 w-3" />,
    description: 'Started before Clockify tracking (Feb 2025), so hours are incomplete',
  },
  legacy: {
    label: 'Legacy',
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
    icon: <Archive className="h-3 w-3" />,
    description: 'Completed sprint with no data',
  },
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    icon: <Calendar className="h-3 w-3" />,
    description: 'Future sprint, tracking not started',
  },
}

interface TrackingStatusBadgeProps {
  status: TrackingStatus | null | undefined
  showIcon?: boolean
  showDescription?: boolean
  className?: string
}

export function TrackingStatusBadge({
  status,
  showIcon = true,
  className,
}: TrackingStatusBadgeProps) {
  // Don't show badge for fully tracked sprints (they're working as expected)
  // Only show badges for sprints that need attention or are legacy/pending
  if (!status || status === 'fully_tracked') {
    return null
  }

  const config = trackingStatusConfig[status]

  if (!config) {
    return null
  }

  return (
    <Badge
      className={`${config.color} ${className || ''}`}
      title={config.description}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}

// Export config for use in filters and other components
export { trackingStatusConfig }
export type { TrackingStatusConfig }
