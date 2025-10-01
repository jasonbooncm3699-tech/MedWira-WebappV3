import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client for API routes and Server Components
 * Compatible with Next.js 15 async cookies API
 * Uses cookie-based session management for OAuth flows
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
            console.log('🍪 Server-side cookie set:', name, 'with options:', options)
          } catch (error) {
            console.warn('⚠️ Failed to set server-side cookie:', name, error)
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
            console.log('🗑️ Server-side cookie removed:', name)
          } catch (error) {
            console.warn('⚠️ Failed to remove server-side cookie:', name, error)
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
