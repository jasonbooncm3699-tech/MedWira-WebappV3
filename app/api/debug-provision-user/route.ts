import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from '@/lib/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interface for user profile data
interface UserProfile {
  id: string;
  token_count: number;
  referral_code: string | null;
  referral_count: number;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

// Function to generate unique referral code
async function generateUniqueReferralCode(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let referralCode = '';
  
  // Try up to 10 times to generate a unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    // Generate 8-character code
    for (let i = 0; i < 8; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if this code already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('referral_code', referralCode)
      .single();
    
    // If no existing profile found, this code is unique
    if (!existingProfile) {
      return referralCode;
    }
    
    // Reset for next attempt
    referralCode = '';
  }
  
  // If we couldn't generate a unique code after 10 attempts, add timestamp
  const timestamp = Date.now().toString(36).toUpperCase();
  return `REF${timestamp.substring(timestamp.length - 5)}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Debug provision user endpoint called');
    
    // Get the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header found');
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }
    
    // Extract the Bearer token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('❌ No bearer token found');
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      );
    }
    
    console.log('🔍 Verifying user session with token:', token.substring(0, 20) + '...');
    
    // Verify the user session using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Invalid session token:', authError?.message);
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    console.log('✅ User session verified:', {
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || 'User'
    });
    
    // Check if user profile already exists in user_profiles table
    console.log('🔍 Checking if user profile exists in user_profiles table...');
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if profile doesn't exist
      console.error('❌ Error fetching user profile:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check user profile', details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (existingProfile) {
      console.log('✅ User profile already exists:', {
        userId: existingProfile.id,
        tokenCount: existingProfile.token_count,
        referralCode: existingProfile.referral_code
      });
      
      // Return existing profile
      return NextResponse.json({
        success: true,
        message: 'User profile already exists',
        action: 'none',
        profile: existingProfile
      }, { status: 200 });
    }
    
    // User profile doesn't exist, create it
    console.log('⚠️ User profile not found, creating new profile...');
    
    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();
    console.log('🎯 Generated referral code:', referralCode);
    
    // Extract user name from metadata or email
    const userName = user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    'User';
    
    // Create new user profile
    const newProfile: Omit<UserProfile, 'created_at' | 'updated_at'> = {
      id: user.id,
      token_count: 30, // Welcome bonus: 30 tokens
      referral_code: referralCode,
      referral_count: 0,
      referred_by: null
    };
    
    console.log('📝 Creating user profile:', newProfile);
    
    const { data: createdProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert([newProfile])
      .select('*')
      .single();
    
    if (createError) {
      console.error('❌ Error creating user profile:', createError);
      return NextResponse.json(
        { error: 'Failed to create user profile', details: createError.message },
        { status: 500 }
      );
    }
    
    console.log('🎉 User profile created successfully:', {
      userId: createdProfile.id,
      tokenCount: createdProfile.token_count,
      referralCode: createdProfile.referral_code
    });
    
    // Return the created profile
    return NextResponse.json({
      success: true,
      message: 'User profile created successfully',
      action: 'created',
      profile: createdProfile
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Unexpected error in debug provision user endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  );
}
