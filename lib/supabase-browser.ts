import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

/**
 * Browser-side Supabase client for client components
 * Automatically handles HTTP-only cookies set by the server
 * This is the definitive solution for cookie-based authentication
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
