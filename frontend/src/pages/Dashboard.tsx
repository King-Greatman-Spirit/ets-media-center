import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { apiRequest } from '@/utils/api'
import { getStatusColor } from '@/utils/format'
import brand from '@/utils/brand'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState<any>({})
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const { token } = useAuthStore()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await apiRequest('/api/analytics/summary')
      setStats(data)
    } catch (e) {
      console.error(e)
    }
  }

  const statCards = [
    { label: 'Total Videos', value: '—', icon: '🎬', color: brand.colors.gold },
    { label: 'Clips Identified', value: '—', icon: '✂️', color: brand.colors.gold },
    { label: 'Content Generated', value: '—', icon: '📝', color: brand.colors.gold },
    { label: 'Posts Scheduled', value: stats.total_posts || 0, icon: '📅', color: brand.colors.gold },
    { label: 'Published', value: stats.published_posts || 0, icon: '✅', color: brand.colors.gold },
    { label: 'Total Views', value: stats.total_views || 0, icon: '👁️', color: brand.colors.gold },
    { label: 'Platforms Connected', value: '—', icon: '🔗', color: brand.colors.gold },
    { label: 'Media Engine Status', value: 'Ready', icon: '⚙️', color: brand.colors.gold },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Dashboard</h1>
          <p style={{ color: brand.colors.gold, margin: '4px 0 0' }}>{brand.tagline}</p>
        </div>
      </div>

      <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {statCards.map((card, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Recent Activity</h2>
        <div className="card">
          {recentActivity.length === 0 ? (
            <p style={{ color: '#888' }}>No recent activity. Upload your first video to get started.</p>
          ) : (
            recentActivity.map((item, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.action}</span>
                  <span className="status-badge" style={{ background: getStatusColor(item.status) }}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/library">
            <button className="btn-primary">📤 Upload Video</button>
          </Link>
          <Link href="/studio">
            <button className="btn-secondary">⚡ Run Media Engine</button>
          </Link>
          <Link href="/calendar">
            <button className="btn-secondary">📅 View Calendar</button>
          </Link>
          <Link href="/connections">
            <button className="btn-secondary">🔗 Connect Platforms</button>
          </Link>
        </div>
      </div>
    </div>
  )
}
