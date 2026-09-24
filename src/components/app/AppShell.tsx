// ============================================================
// App Shell - Main Layout Component
// v2.0: Enhanced with DA/BI, Agent navigation
// ============================================================

import { Link, useRouterState } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import {
  LayoutDashboard, FolderOpen, Sparkles, CalendarDays, Plug,
  LogOut, Menu, X, BarChart3, Robot, Settings,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { EtsWordmark, ETS_COVER_URL } from '@/components/brand/Brand'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PLATFORMS } from '@/lib/platforms'

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/library', label: 'Media Library', icon: FolderOpen },
  { to: '/studio', label: 'AI Studio', icon: Sparkles },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/da', label: 'DA/BI Analytics', icon: BarChart3 },
  { to: '/autonomous', label: 'Agents', icon: Robot },
  { to: '/connections', label: 'Connections', icon: Plug },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const displayName = user?.user_metadata?.['display_name'] || user?.email?.split('@')[0] || 'Soldier'

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname.startsWith(to)
        return (
          <Link
            key={to} to={to} onClick={() => setOpen(false)}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              active ? 'bg-sidebar-accent text-primary shadow-[inset_2px_0_0_0_var(--primary)]' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )}
          >
            <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-primary')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/dashboard" onClick={() => setOpen(false)}>
          <EtsWordmark />
        </Link>
        <button className="lg:hidden text-muted-foreground" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-5 mb-4 h-px bg-gradient-to-r from-primary/50 via-primary/10 to-transparent" />
      {nav}
      <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-border/60">
        <div className="h-16 bg-cover bg-center" style={{ backgroundImage: `url(${ETS_COVER_URL})` }} role="img" aria-label="End Time Soldiers cover" />
        <p className="px-3 py-2 font-display text-[9px] leading-relaxed tracking-[0.18em] text-muted-foreground">RAISING A KINGDOM ARMY FOR SUCH A TIME AS THIS</p>
      </div>
      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4">
        <Avatar className="h-9 w-9 ring-1 ring-primary/40">
          <AvatarFallback className="bg-accent text-accent-foreground font-display text-xs">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-muted-foreground"><Menu className="h-5 w-5" /></button>
          <EtsWordmark compact />
          <span className="font-display text-sm tracking-[0.2em] text-gold-gradient">ETS</span>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 font-display text-[11px] uppercase tracking-[0.3em] text-primary">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
