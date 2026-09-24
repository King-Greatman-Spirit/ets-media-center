import { useState, useEffect } from 'react'
import { apiRequest } from '@/utils/api'
import brand from '@/utils/brand'
import { getStatusColor } from '@/utils/format'

export default function Connections() {
  const [platforms, setPlatforms] = useState<any[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const data = await apiRequest('/api/platforms/')
      setPlatforms(data)
    } catch (e) {
      console.error(e)
    }
  }

  const connectPlatform = async (platformId: string) => {
    setConnecting(platformId)
    try {
      await apiRequest(`/api/platforms/${platformId}/connect`, {
        method: 'PUT',
        body: JSON.stringify({ credentials: {} })
      })
      fetchPlatforms()
    } catch (e) {
      console.error(e)
    }
    setConnecting(null)
  }

  const getPlatformIcon = (name: string) => {
    const icons: Record<string, string> = {
      youtube: '▶️',
      tiktok: '🎵',
      instagram: '📷',
      facebook: '👥',
      x_twitter: '🐦',
      threads: '💬',
      linkedin: '💼',
      telegram: '📱',
    }
    return icons[name] || '🔗'
  }

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Platform Connections</h1>
      <p style={{ color: brand.colors.gold, marginBottom: 32 }}>Connect your social media accounts to enable automatic publishing</p>

      <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {brand.platforms.map((platform) => {
          const connected = platforms.find((p) => p.name === platform.id)
          return (
            <div key={platform.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <span style={{ fontSize: 40 }}>{getPlatformIcon(platform.id)}</span>
                <div>
                  <h3 style={{ margin: 0, color: brand.colors.white }}>{platform.name}</h3>
                  <p style={{ fontSize: 13, color: '#888' }}>Handle: {platform.handle}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="status-badge" style={{ background: connected?.connection_status === 'connected' ? '#1a5c1a' : '#333', color: connected?.connection_status === 'connected' ? '#fff' : '#888' }}>
                  {connected?.connection_status === 'connected' ? '✅ Connected' : '❌ Disconnected'}
                </span>
                <button
                  className={connected?.connection_status === 'connected' ? 'btn-secondary' : 'btn-primary'}
                  onClick={() => connectPlatform(platform.id)}
                  disabled={connecting === platform.id}
                >
                  {connecting === platform.id ? 'Connecting...' : connected?.connection_status === 'connected' ? 'Reconnect' : 'Connect'}
                </button>
              </div>

              {connected && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
                  <div>Posts published: {connected.post_count}</div>
                  <div>Last posted: {connected.last_posted ? new Date(connected.last_posted).toLocaleDateString() : 'Never'}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 32 }}>
        <h3>🔒 Security Note</h3>
        <p style={{ fontSize: 14, color: '#aaa', marginTop: 8 }}>
          All API credentials are stored securely. Never share your credentials. The system never requests or stores passwords in plain text. Authentication uses OAuth tokens through secure vaults.
        </p>
      </div>
    </div>
  )
}
