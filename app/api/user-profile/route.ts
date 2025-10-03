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
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Use service key to bypass RLS
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get profile data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('token_count, referral_code, referred_by, display_name, avatar_url')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('❌ Error fetching profile:', error);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Get auth user data for Google metadata
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    let displayName = '';
    let avatarUrl = '';
    
    if (!authError && authUser.user) {
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
    
    console.log('✅ User profile data retrieved:', {
      tokens: userProfile.tokens,
      referral_code: userProfile.referral_code
    });
    
    return NextResponse.json(userProfile);
    
  } catch (error) {
    console.error('❌ User Profile API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
