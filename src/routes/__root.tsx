import { createRootRoute, Outlet } from "@tanstack/react-router"
import { AuthProvider } from "@/hooks/useAuth"
import { Toaster } from "@/components/ui/sonner"
import "@/styles.css"

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">404 — Not Found</h1>
        <p className="text-muted-foreground">This page does not exist.</p>
      </div>
    </div>
  ),
})

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  )
}
