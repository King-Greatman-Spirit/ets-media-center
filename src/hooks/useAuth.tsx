// ============================================================
// Auth Hook
// ============================================================
import { useAuthStore } from '@/store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useEffect } from 'react'

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAuth(session.user, session.access_token)
      } else {
        logout()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    logout()
  }

  return { user, token, isAuthenticated, signOut }
}
