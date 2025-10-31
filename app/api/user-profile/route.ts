/**
 * API endpoint to get user profile data
 * This bypasses RLS issues by using the service key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log('🔍 User Profile API Request received');
  
  try {
    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      console.log('❌ Missing user ID in request');
      return NextResponse.json(
        { 
          error: 'User ID is required',
          status: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log('❌ Invalid user ID format:', userId);
      return NextResponse.json(
        { 
          error: 'Invalid user ID format',
          status: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }
    
    // Use client-side environment variables (available in Vercel)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ CRITICAL: Missing Supabase environment variables:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
      return NextResponse.json(
        { 
          error: 'Server configuration error - missing Supabase credentials',
          status: 'CONFIGURATION_ERROR'
        },
        { status: 500 }
      );
    }
    
    // Use service role key for admin access to auth.users table
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      console.error('❌ CRITICAL: Missing Supabase service role key for admin access');
      return NextResponse.json(
        { 
          error: 'Server configuration error - missing service role key',
          status: 'CONFIGURATION_ERROR'
        },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get profile data with better error handling
    // Note: This will only work if RLS policies allow anon access or if user is authenticated
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens, referral_code, referred_by, display_name, avatar_url, email, subscription_tier')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      
      // Check if it's an RLS policy error
      if (profileError.message?.includes('permission') || profileError.message?.includes('RLS')) {
        return NextResponse.json(
          { 
            error: 'Access denied - RLS policy issue',
            status: 'RLS_ACCESS_DENIED'
          },
          { status: 403 }
        );
      }
      
      // Check if profile doesn't exist
      if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
        return NextResponse.json(
          { 
            error: 'User profile not found',
            status: 'PROFILE_NOT_FOUND'
          },
          { status: 404 }
        );
      }
      
      // Other database errors
      return NextResponse.json(
        { 
          error: 'Database error: ' + profileError.message,
          status: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    // CRITICAL FIX: Check if the profile was not found (data is null from Supabase .single())
    // This handles the case where Supabase returns { data: null, error: null } for non-existent users
    if (!profile) {
      console.warn(`⚠️ Profile not found for userId: ${userId}`);
      return NextResponse.json(
        { 
          error: 'Profile not found',
          status: 'PROFILE_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    // Get user data from auth.users table for name and email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    let userName = 'User';
    let userEmail = '';
    
    if (authUser?.user) {
      // Extract first name from user metadata
      const fullName = authUser.user.user_metadata?.full_name || 
                      authUser.user.user_metadata?.name || 
                      authUser.user.user_metadata?.user_name;
      
      if (fullName) {
        userName = fullName.split(' ')[0]; // Get first name only
      }
      
      userEmail = authUser.user.email || '';
    }
    
    // Use display_name and avatar_url from profile data
    const displayName = profile.display_name || userName || userEmail.split('@')[0] || '';
    const avatarUrl = profile.avatar_url || '';
    
    // Return combined data with proper name from auth.users
    const userProfile = {
      id: userId,
      email: userEmail,
      name: userName, // First name from authentication user data
      tokens: profile.tokens,
      referral_code: profile.referral_code,
      referred_by: profile.referred_by,
      display_name: displayName,
      avatar_url: avatarUrl,
      subscription_tier: profile.subscription_tier || 'free'
    };
    
    console.log('✅ User profile data retrieved successfully:', {
      tokens: userProfile.tokens,
      referral_code: userProfile.referral_code,
      hasDisplayName: !!userProfile.display_name,
      hasAvatarUrl: !!userProfile.avatar_url
    });
    
    return NextResponse.json(userProfile);
    
  } catch (error) {
    console.error('❌ User Profile API Unexpected Error:', error);
    
    // Return appropriate error based on error type
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Network error - unable to connect to database',
          status: 'NETWORK_ERROR'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        status: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
