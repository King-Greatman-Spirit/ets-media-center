// ============================================================
// Router Configuration
// ============================================================
import { createFileRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/app/AppShell'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return null
  }
  
  return <AppShell />
}

// Auth route
export const authRoute = createFileRoute('/auth')({
  component: AuthPage,
})

function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian">
      <div className="card p-8 w-full max-w-md">
        <h1 className="font-display text-2xl font-bold text-gold text-center mb-2">End Time Soldiers</h1>
        <p className="text-muted-foreground text-center mb-6">Sign in to access your Command Center</p>
        <div className="space-y-4">
          <input type="email" placeholder="Email" className="w-full" />
          <input type="password" placeholder="Password" className="w-full" />
          <button className="btn-primary w-full">Sign In</button>
          <p className="text-xs text-muted-foreground text-center">
            Don't have an account? Contact the admin.
          </p>
        </div>
      </div>
    </div>
  )
}
