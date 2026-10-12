import { describe, expect, it } from 'vitest'
import { summarisePersonTime, taskTableByPerson } from './person-time'

const row = (user_id: string, task_category: string, total_hours: number, sprint_count = 4) => ({
  user_id,
  task_category,
  sprint_count,
  total_hours,
})

describe('summarisePersonTime', () => {
  it('averages every task over the sprints the person worked on', () => {
    const rows = [row('a', 'Pitching', 40), row('a', 'Ideation', 8), row('a', 'Admin', 20), row('a', 'Reporting', 4)]
    const s = summarisePersonTime(rows, 'a')
    expect(s.sprintCount).toBe(4)
    expect(s.topTasks).toEqual([
      { category: 'Pitching', hours: 10 },
      { category: 'Admin', hours: 5 },
      { category: 'Ideation', hours: 2 },
    ])
    expect(s.avgHoursPerSprint).toBe(18)
  })

  it("ignores other people's time", () => {
    const rows = [row('a', 'Pitching', 8), row('b', 'Uncategorized', 400, 2)]
    const s = summarisePersonTime(rows, 'a')
    expect(s.topTasks).toEqual([{ category: 'Pitching', hours: 2 }])
    expect(s.avgHoursPerSprint).toBe(2)
  })

  it('returns an empty summary for someone with no tracked sprints', () => {
    expect(summarisePersonTime([row('a', 'Pitching', 8)], 'z')).toEqual({
      sprintCount: 0,
      avgHoursPerSprint: 0,
      topTasks: [],
    })
  })

  it('accepts numeric strings from the database', () => {
    const rows = [{ user_id: 'a', task_category: 'Pitching', sprint_count: '2', total_hours: '7.5' }]
    // numeric columns can arrive as strings from PostgREST
    const s = summarisePersonTime(rows as never, 'a')
    expect(s.topTasks).toEqual([{ category: 'Pitching', hours: 3.75 }])
  })
})

describe('taskTableByPerson', () => {
  it('gives one row per category with each person\'s average', () => {
    const rows = [row('a', 'Pitching', 40), row('b', 'Pitching', 6, 2), row('a', 'Admin', 8)]
    expect(taskTableByPerson(rows, ['a', 'b'])).toEqual([
      { category: 'Admin', dpr_data: [{ dpr_id: 'a', avg_hours: 2, sprint_count: 4 }] },
      {
        category: 'Pitching',
        dpr_data: [
          { dpr_id: 'a', avg_hours: 10, sprint_count: 4 },
          { dpr_id: 'b', avg_hours: 3, sprint_count: 2 },
        ],
      },
    ])
  })

  it('leaves out people who are not listed', () => {
    const rows = [row('a', 'Pitching', 8), row('nova', 'Uncategorized', 400)]
    expect(taskTableByPerson(rows, ['a']).map((t) => t.category)).toEqual(['Pitching'])
  })

  it('matches the summary card averages', () => {
    const rows = [row('a', 'Pitching', 40), row('a', 'Admin', 8), row('a', 'Ideation', 2)]
    const table = taskTableByPerson(rows, ['a'])
    const tableTotal = table.reduce((sum, t) => sum + t.dpr_data[0].avg_hours, 0)
    expect(tableTotal).toBe(summarisePersonTime(rows, 'a').avgHoursPerSprint)
  })
})
