import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client for API routes and Server Components
 * Compatible with Next.js 15 async cookies API
 * Uses HTTP-only cookie-based session management for OAuth flows
 * This is the definitive solution for server-side authentication
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
            // Enhanced cookie configuration for mobile compatibility
            const cookieOptions = {
              name,
              value,
              ...options,
              // Mobile-friendly cookie settings
              sameSite: options.sameSite || 'lax' as const,
              secure: options.secure !== undefined ? options.secure : true,
              httpOnly: options.httpOnly !== undefined ? options.httpOnly : true,
              path: options.path || '/',
              maxAge: options.maxAge || 3600 * 24 * 7, // 7 days default
            }
            
            cookieStore.set(cookieOptions)
            console.log('🍪 Server-side HTTP-only cookie set:', name, {
              sameSite: cookieOptions.sameSite,
              secure: cookieOptions.secure,
              httpOnly: cookieOptions.httpOnly,
              path: cookieOptions.path
            })
          } catch (error) {
            console.warn('⚠️ Failed to set server-side HTTP-only cookie:', name, error)
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
            console.log('🗑️ Server-side HTTP-only cookie removed:', name)
          } catch (error) {
            console.warn('⚠️ Failed to remove server-side HTTP-only cookie:', name, error)
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
