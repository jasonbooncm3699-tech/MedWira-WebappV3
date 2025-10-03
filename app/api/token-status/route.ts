/**
 * Next.js API Route for Token Status Check
 * 
 * This endpoint allows checking a user's current token balance
 * without consuming tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "User ID is required" 
        },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Checking token status for user: ${userId}`);
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Query user's token count
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('token_count, updated_at')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Token status check error:', error);
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Failed to check token status" 
        },
        { status: 500 }
      );
    }
    
    console.log(`✅ Token status retrieved for user: ${userId}, tokens: ${profile?.token_count || 0}`);
    
    return NextResponse.json({
      status: "SUCCESS",
      data: {
        user_id: userId,
        token_count: profile?.token_count || 0,
        last_updated: profile?.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Token status endpoint error:', error);
    return NextResponse.json(
      { 
        status: "ERROR", 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
