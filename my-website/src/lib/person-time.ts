export interface PersonTaskRow {
  user_id: string
  task_category: string
  sprint_count: number
  total_hours: number
}

export interface PersonTimeSummary {
  sprintCount: number
  avgHoursPerSprint: number
  topTasks: { category: string; hours: number }[]
}

/**
 * Average hours per sprint and top tasks for one person's own time.
 * Every category is divided by the same sprint count (the sprints the person
 * logged time on), so the task averages add up to the overall average.
 */
export function summarisePersonTime(rows: PersonTaskRow[], userId: string, topN = 3): PersonTimeSummary {
  const own = rows.filter((r) => r.user_id === userId)
  const sprintCount = Number(own[0]?.sprint_count ?? 0)
  if (sprintCount === 0) return { sprintCount: 0, avgHoursPerSprint: 0, topTasks: [] }

  const tasks = own
    .map((r) => ({ category: r.task_category, hours: Number(r.total_hours) / sprintCount }))
    .filter((t) => t.hours > 0)
    .sort((a, b) => b.hours - a.hours)

  return {
    sprintCount,
    avgHoursPerSprint: tasks.reduce((sum, t) => sum + t.hours, 0),
    topTasks: tasks.slice(0, topN),
  }
}

export interface TaskTableRow {
  category: string
  dpr_data: { dpr_id: string; avg_hours: number; sprint_count: number }[]
}

/**
 * Rows for the "Average Hours per Task Category" table: one row per category,
 * one value per person, using the same averages as summarisePersonTime so the
 * table and the summary cards agree. Only the given people are included.
 */
export function taskTableByPerson(rows: PersonTaskRow[], userIds: string[]): TaskTableRow[] {
  const people = new Set(userIds)
  const byCategory = new Map<string, TaskTableRow['dpr_data']>()

  for (const r of rows) {
    const sprintCount = Number(r.sprint_count)
    if (!people.has(r.user_id) || sprintCount === 0) continue
    const avg = Number(r.total_hours) / sprintCount
    if (avg <= 0) continue
    if (!byCategory.has(r.task_category)) byCategory.set(r.task_category, [])
    byCategory.get(r.task_category)!.push({ dpr_id: r.user_id, avg_hours: avg, sprint_count: sprintCount })
  }

  return Array.from(byCategory, ([category, dpr_data]) => ({ category, dpr_data }))
    .sort((a, b) => a.category.localeCompare(b.category))
}
