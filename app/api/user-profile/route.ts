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
    
    // CRITICAL: Validate environment variables before creating Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ CRITICAL: Missing Supabase environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return NextResponse.json(
        { 
          error: 'Server configuration error - missing Supabase credentials',
          status: 'CONFIGURATION_ERROR'
        },
        { status: 500 }
      );
    }
    
    // Use service key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get profile data with better error handling
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
    
    // CRITICAL FIX: If no database error, but profile is STILL null (e.g., user not found)
    if (!profile) {
      console.error('❌ CRITICAL: Profile is null after successful query - user not found');
      return NextResponse.json(
        { 
          error: 'Profile data missing after query - user not found',
          status: 'PROFILE_NULL_AFTER_QUERY'
        },
        { status: 404 }
      );
    }
    
    // Get auth user data for Google metadata
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    let displayName = '';
    let avatarUrl = '';
    
    if (authError) {
      console.warn('⚠️ Auth user fetch failed:', authError.message);
      // Continue with profile data only
    } else if (authUser?.user) {
      const googleData = authUser.user.user_metadata || {};
      displayName = googleData.full_name || googleData.name || '';
      avatarUrl = googleData.avatar_url || googleData.picture || '';
    }
    
    // Return combined data
    const userProfile = {
      id: userId,
      email: authUser?.user?.email || '',
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
