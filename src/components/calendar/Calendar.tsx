// ============================================================
// Calendar Component - Upgraded
// ============================================================

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { postsQuery } from '@/lib/data'
import { PageHeader } from '@/components/app/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { useContentStore } from '@/store'
import brand from '@/lib/platforms'
import { format, addDays, subDays } from 'date-fns'

export function CalendarPage() {
  const posts = useQuery(postsQuery)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { setCalendar } = useContentStore()

  const days = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i))

  const getPostsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return posts.data?.filter((p: any) => p.scheduled_at?.startsWith(dateStr) ?? false) ?? []
  }

  return (
    <div>
      <PageHeader eyebrow="Calendar" title="Content Calendar" description="Schedule, manage, and publish content across all platforms." />

      <div className="flex gap-4 mb-6">
        <Button variant="outline" onClick={() => setSelectedDate(subDays(selectedDate, 7))}>◀ Previous</Button>
        <h2 className="font-display text-xl font-bold text-gold-gradient">{format(selectedDate, 'MMMM yyyy')}</h2>
        <Button variant="outline" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>Next ▶</Button>
        <Button className="bg-gold-gradient text-primary-foreground ml-auto">+ Add Post</Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-primary py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayPosts = getPostsForDay(day)
          return (
            <div key={day.toISOString()} className="card p-2 min-h-20 cursor-pointer hover:gold-ring" onClick={() => setSelectedDate(day)}>
              <div className="text-xs font-semibold mb-1">{format(day, 'd')}</div>
              {dayPosts.slice(0, 2).map((p: any, i: number) => (
                <div key={i} className="text-[10px] mb-1 truncate">
                  <Badge variant="outline" style={{ background: getStatusColor(p.status), color: '#fff', fontSize: '9px' }}>{p.platform}</Badge>
                </div>
              ))}
              {dayPosts.length > 2 && <div className="text-[10px] text-primary">+{dayPosts.length - 2} more</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = { idea: '#666', draft: '#555', needs_review: '#8B0000', approved: '#1a5c1a', scheduled: '#2a4a8a', published: '#D4AF37', failed: '#660000' }
  return colors[status] || '#555'
}
