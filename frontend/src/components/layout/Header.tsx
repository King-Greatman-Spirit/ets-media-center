import { useAuthStore } from '@/store'
import Link from 'next/link'
import brand from '@/utils/brand'

export function Header() {
  const { user, logout } = useAuthStore()

  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 20 }}>⚔️</span>
        <span style={{ fontFamily: brand.font.display, color: brand.colors.gold, fontSize: 18 }}>
          {brand.name} Command Center
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/">
          <span style={{ color: '#888', fontSize: 13 }}>{brand.tagline}</span>
        </Link>
        {user ? (
          <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: 13 }} onClick={logout}>
            Logout
          </button>
        ) : (
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 13 }}>
            Login
          </button>
        )}
      </div>
    </div>
  )
}
