// ============================================================
// Route Tree - TanStack Router Configuration
// ============================================================
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <div>Redirecting to login...</div>
}

import { Outlet } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
