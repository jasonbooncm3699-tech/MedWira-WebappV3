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

/**
 * Helper function to get session from cookies (fallback method)
 * This checks for the session cookie set by the OAuth callback
 */
export function getSessionFromCookies() {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check for session cookie
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('sb-session='));
    
    if (sessionCookie) {
      const sessionValue = sessionCookie.split('=')[1];
      const decodedValue = decodeURIComponent(sessionValue);
      return JSON.parse(decodedValue);
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Failed to parse session from cookies:', error);
    return null;
  }
}
