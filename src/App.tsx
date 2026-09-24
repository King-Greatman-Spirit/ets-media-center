import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './router'
import { AuthProvider } from './hooks/useAuth'
import { Tour } from './components/ui/tour'
import { LandingPage } from './components/ui/tour'
import { useAuthStore } from './store'

const queryClient = new QueryClient()

function AppContent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return (
      <>
        <RouterProvider router={router} />
        <Toaster />
        <Tour />
      </>
    )
  }

  return (
    <>
      <LandingPage />
      <Tour />
    </>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  )
}
