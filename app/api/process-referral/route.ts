/**
 * API Route for Processing Referral Rewards
 * 
 * This endpoint processes referral rewards when a user signs up with a referral code.
 * It awards tokens to the referrer and tracks referral statistics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  console.log('🎯 Referral Processing API Request received');
  
  try {
    // Parse request body
    const body = await request.json();
    const { new_user_id, referral_code } = body;
    
    // Validate required parameters
    if (!new_user_id) {
      console.log('❌ Missing new_user_id');
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "New user ID is required." 
        },
        { status: 400 }
      );
    }
    
    if (!referral_code) {
      console.log('❌ Missing referral_code');
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Referral code is required." 
        },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`🎯 Processing referral: User ${new_user_id} used code ${referral_code}`);
    
    // Call the database function to process referral rewards
    const { data: result, error } = await supabase
      .rpc('process_referral_reward', {
        new_user_id: new_user_id,
        referral_code_param: referral_code
      });
    
    if (error) {
      console.error('❌ Database error processing referral:', error);
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Failed to process referral reward: " + error.message 
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Referral processing result:', result);
    
    // Return the result from the database function
    return NextResponse.json({
      status: "SUCCESS",
      data: result
    });

  } catch (error) {
    console.error("❌ Referral Processing API Error:", error);
    return NextResponse.json(
      { 
        status: "ERROR", 
        message: "Internal server error processing referral" 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve referral statistics
export async function GET(request: NextRequest) {
  console.log('📊 Referral Stats API Request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "User ID is required." 
        },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`📊 Getting referral stats for user: ${user_id}`);
    
    // Get referral statistics
    const { data: stats, error } = await supabase
      .rpc('get_referral_stats', {
        user_id_param: user_id
      });
    
    if (error) {
      console.error('❌ Database error getting referral stats:', error);
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Failed to get referral statistics: " + error.message 
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Referral stats retrieved:', stats);
    
    // Return the statistics
    return NextResponse.json({
      status: "SUCCESS",
      data: stats
    });

  } catch (error) {
    console.error("❌ Referral Stats API Error:", error);
    return NextResponse.json(
      { 
        status: "ERROR", 
        message: "Internal server error getting referral stats" 
      },
      { status: 500 }
    );
  }
}
