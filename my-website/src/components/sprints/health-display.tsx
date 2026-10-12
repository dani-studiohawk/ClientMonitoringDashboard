import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { HEALTH_COLORS, HEALTH_LABELS, type SprintHealth } from '@/lib/sprint-health'

const HEALTH_ICONS: Record<SprintHealth, typeof TrendingUp> = {
  'not-started': Clock,
  'on-track': TrendingUp,
  'ahead': TrendingUp,
  'needs-attention': AlertTriangle,
  'kpi-complete': CheckCircle2,
  'completed': CheckCircle2,
}

export interface HealthDisplay {
  label: string
  color: string
  icon: React.ReactNode
}

/** Label, badge colour and icon for a health value (null when there is none). */
export function getHealthDisplay(health: SprintHealth | null, iconClassName = 'h-3 w-3'): HealthDisplay | null {
  if (!health) return null
  const Icon = HEALTH_ICONS[health]
  return {
    label: HEALTH_LABELS[health],
    color: HEALTH_COLORS[health],
    icon: <Icon className={iconClassName} />,
  }
}
