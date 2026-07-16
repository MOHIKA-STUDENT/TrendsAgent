import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * This is the browser client. It deliberately uses the public anon key only.
 * Never put a Supabase service-role key in a VITE_ variable or frontend file.
 */
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: 'Supabase is not configured. Check your local .env file.' }

  const { error } = await supabase.from('workspaces').select('id', { head: true, count: 'exact' }).limit(1)
  if (error) {
    if (error.code === '42P01') return { ok: false, message: 'Connected, but the database setup is still needed.' }
    return { ok: false, message: `Connection check failed: ${error.message}` }
  }
  return { ok: true, message: 'Supabase is connected and the secure tables are ready.' }
}
