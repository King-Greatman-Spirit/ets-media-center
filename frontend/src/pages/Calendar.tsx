import { useState, useEffect } from 'react'
import { apiRequest } from '@/utils/api'
import brand from '@/utils/brand'
import Link from 'next/link'

export default function Calendar() {
  const [posts, setPosts] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPlatform, setSelectedPlatform] = useState('')

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const data = await apiRequest('/api/calendar/')
      setPosts(data)
    } catch (e) {
      console.error(e)
    }
  }

  const daysInMonth = Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1)
  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return posts.filter((p) => p.date === dateStr)
  }

  const handleSchedule = async () => {
    if (!selectedDate) return
    try {
      await apiRequest('/api/calendar/schedule', {
        method: 'POST',
        body: JSON.stringify({ dates: [selectedDate], pillars: brand.pillars })
      })
      fetchPosts()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Content Calendar</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn-secondary" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>◀</button>
          <h2 style={{ color: brand.colors.gold, margin: 0 }}>{monthName}</h2>
          <button className="btn-secondary" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>▶</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ maxWidth: 250 }}
        />
        <button className="btn-primary" style={{ marginLeft: 12 }} onClick={handleSchedule}>
          📅 Schedule for Selected Date
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 24 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ textAlign: 'center', color: brand.colors.gold, fontWeight: 600, fontSize: 12 }}>{d}</div>
        ))}
        {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysInMonth.map((day) => {
          const dayPosts = getPostsForDay(day)
          return (
            <div
              key={day}
              className="card"
              style={{ padding: 8, minHeight: 80, cursor: 'pointer' }}
              onClick={() => setSelectedDate(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{day}</div>
              {dayPosts.slice(0, 3).map((post: any, i: number) => (
                <div key={i} style={{ fontSize: 10, marginBottom: 2 }}>
                  <span className="status-badge" style={{ background: '#333', color: '#ccc', fontSize: 9 }}>
                    {post.pillar?.split(' ')[0] || 'Post'}
                  </span>
                </div>
              ))}
              {dayPosts.length > 3 && (
                <div style={{ fontSize: 10, color: brand.colors.gold }}>+{dayPosts.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3>📊 Calendar Stats</h3>
        <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
          <div>Total Posts: <strong style={{ color: brand.colors.gold }}>{posts.length}</strong></div>
          <div>Scheduled: <strong style={{ color: brand.colors.gold }}>{posts.filter((p) => p.status === 'scheduled').length}</strong></div>
          <div>Published: <strong style={{ color: brand.colors.gold }}>{posts.filter((p) => p.status === 'published').length}</strong></div>
          <div>Pending Review: <strong style={{ color: brand.colors.gold }}>{posts.filter((p) => p.status === 'needs_review').length}</strong></div>
        </div>
      </div>
    </div>
  )
}
