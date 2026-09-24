// ============================================================
// Server Entry Point
// ============================================================
import { createServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'

export const serverFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    // Server-side function execution
    return { success: true }
  })

async function requireSupabaseAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user
}
