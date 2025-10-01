// Simple OAuth test to verify Supabase configuration
// This will help identify if OAuth providers are properly configured

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test OAuth configuration
export async function testOAuthConfig() {
  console.log('🧪 Testing OAuth Configuration...');
  console.log('🌐 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Key present:', !!supabaseAnonKey);
  
  try {
    // Test Google OAuth
    console.log('🔍 Testing Google OAuth...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    console.log('📡 Google OAuth Response:', { data, error });
    
    if (error) {
      console.error('❌ Google OAuth Error:', error.message);
      console.error('❌ Error details:', error);
      return { success: false, error: error.message };
    }
    
    if (data.url) {
      console.log('✅ Google OAuth URL generated:', data.url);
      return { success: true, url: data.url };
    } else {
      console.error('❌ No redirect URL returned');
      return { success: false, error: 'No redirect URL returned' };
    }
    
  } catch (error) {
    console.error('💥 OAuth Test Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testOAuthConfig = testOAuthConfig;
  console.log('🧪 OAuth test function available! Run: testOAuthConfig()');
}
