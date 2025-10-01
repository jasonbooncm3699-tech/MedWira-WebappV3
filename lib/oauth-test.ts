// Test OAuth Configuration
// This file will help test if OAuth providers are properly configured

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test function to check OAuth configuration
export async function testOAuthConfiguration() {
  console.log('🔍 Testing OAuth Configuration...');
  console.log('🌐 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');
  
  try {
    // Test Google OAuth
    console.log('🔍 Testing Google OAuth...');
    const { data: googleData, error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    console.log('📡 Google OAuth Response:', { googleData, googleError });
    
    if (googleError) {
      console.error('❌ Google OAuth Error:', googleError.message);
      return { success: false, error: googleError.message };
    }
    
    console.log('✅ Google OAuth URL:', googleData.url);
    return { success: true, url: googleData.url };
    
  } catch (error) {
    console.error('💥 OAuth Test Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Test Facebook OAuth
export async function testFacebookOAuth() {
  console.log('🔍 Testing Facebook OAuth...');
  
  try {
    const { data: facebookData, error: facebookError } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    console.log('📡 Facebook OAuth Response:', { facebookData, facebookError });
    
    if (facebookError) {
      console.error('❌ Facebook OAuth Error:', facebookError.message);
      return { success: false, error: facebookError.message };
    }
    
    console.log('✅ Facebook OAuth URL:', facebookData.url);
    return { success: true, url: facebookData.url };
    
  } catch (error) {
    console.error('💥 Facebook OAuth Test Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
