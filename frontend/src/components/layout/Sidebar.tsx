import Link from 'next/link'
import brand from '@/utils/brand'

const menuItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/library', label: 'Media Library', icon: '📁' },
  { href: '/studio', label: 'Repurposing Studio', icon: '⚡' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/connections', label: 'Connections', icon: '🔗' },
]

export function Sidebar() {
  return (
    <div className="sidebar">
      <div style={{ marginBottom: 32 }}>
        <h1 className="logo-text">{brand.name}</h1>
        <p style={{ color: brand.colors.gold, fontSize: 13, marginTop: 4 }}>{brand.tagline}</p>
      </div>

      <nav>
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="sidebar-item">
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
        <div style={{ borderTop: '1px solid #222', paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: '#888' }}>{brand.name}</div>
          <div style={{ fontSize: 11, color: brand.colors.gold }}>{brand.handle}</div>
        </div>
      </div>
    </div>
  )
}
