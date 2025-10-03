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
    
    // Use anon key (client-side access)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get profile data with better error handling
    // Note: This will only work if RLS policies allow anon access or if user is authenticated
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('token_count, referral_code, referred_by, display_name, avatar_url')
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
    
    // For now, skip auth user data fetch since we don't have admin access
    // The profile data already contains display_name and avatar_url if available
    let authUser = null;
    let authError = null;
    
    // Use display_name and avatar_url from profile data
    const displayName = profile.display_name || '';
    const avatarUrl = profile.avatar_url || '';
    
    // Return combined data
    const userProfile = {
      id: userId,
      email: '', // Email not available without admin access
      name: displayName ? displayName.split(' ')[0] : '',
      tokens: profile.token_count,
      referral_code: profile.referral_code,
      referred_by: profile.referred_by,
      display_name: displayName,
      avatar_url: avatarUrl,
      subscription_tier: 'free'
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
