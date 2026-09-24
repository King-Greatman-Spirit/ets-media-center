// ============================================================
// Integration files
// ============================================================

// Supabase Client
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:5432'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// ============================================================
// Auth Middleware
// ============================================================
export async function requireSupabaseAuth() {
  const { supabase } = await import('./client')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

// ============================================================
// Utilities
// ============================================================
export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    idea: '#666', draft: '#555', needs_review: '#8B0000', approved: '#1a5c1a',
    scheduled: '#2a4a8a', published: '#D4AF37', failed: '#660000',
    uploaded: '#666', processing: '#2a4a8a', processed: '#1a5c1a',
    idle: '#888', running: '#2a4a8a', completed: '#1a5c1a', error: '#660000',
  }
  return colors[status] || '#555'
}
