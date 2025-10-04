/**
 * Next.js API Route for Gemini 1.5 Pro Medicine Analysis
 * 
 * This endpoint integrates with the Gemini 1.5 Pro pipeline for medicine analysis
 * with NPRA database integration and token management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runGeminiPipeline } from '@/src/services/geminiAgent';

// Type definitions for the Gemini pipeline response
interface GeminiPipelineResponse {
  status: "SUCCESS" | "ERROR";
  message?: string;
  data?: any;
  httpStatus?: number;
}

export async function POST(request: NextRequest) {
  console.log('🔍 Gemini 1.5 Pro Medicine Analysis API Request received');
  
  try {
    // Parse request body
    const body = await request.json();
    const { image_data, user_id, text_query } = body;
    
    // Validate required parameters
    if (!image_data && !text_query) {
      console.log('❌ Missing required parameters: image_data or text_query');
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Image data or text query is required." 
        },
        { status: 400 }
      );
    }
    
    // CRITICAL: Ensure user_id is passed for the token check
    if (!user_id) {
      console.log('❌ Missing user_id for authentication');
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Authentication required (user_id missing)." 
        },
        { status: 401 }
      );
    }

    console.log(`🚀 Starting Gemini 1.5 Pro pipeline for user: ${user_id}`);
    
    // Call the Gemini 1.5 Pro pipeline
    const result = await runGeminiPipeline(image_data, text_query, user_id) as GeminiPipelineResponse;
    
    console.log(`📊 Pipeline result status: ${result.status}`);
    
    if (result.status === "ERROR") {
      // Use httpStatus if available (from token check), otherwise default to 500
      const statusCode = result.httpStatus || (result.message?.includes('tokens') ? 402 : 500);
      console.log(`❌ Pipeline error (${statusCode}): ${result.message || 'Unknown error'}`);
      
      // For token errors, include current token count
      let remainingTokens = null;
      if (statusCode === 402 && user_id) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('token_count')
            .eq('id', user_id)
            .single();
            
          remainingTokens = profile?.token_count || 0;
        } catch (tokenError) {
          console.error('❌ Error fetching token count for error response:', tokenError);
        }
      }
      
      return NextResponse.json({
        ...result,
        tokensRemaining: remainingTokens
      }, { status: statusCode });
    }

    console.log('✅ Pipeline completed successfully');
    
    // Get remaining tokens after successful processing
    let remainingTokens = null;
    if (result.status === "SUCCESS" && user_id) {
      try {
        const { checkTokenAvailability } = await import('@/src/utils/npraDatabase');
        // We need to get the actual token count, not just check availability
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('token_count')
          .eq('id', user_id)
          .single();
          
        remainingTokens = profile?.token_count || 0;
        console.log(`📊 Remaining tokens: ${remainingTokens}`);
      } catch (tokenError) {
        console.error('❌ Error fetching remaining tokens:', tokenError);
      }
    }
    
    // Send the full result with status and remaining tokens
    return NextResponse.json({
      status: result.status,
      data: result.data,
      message: result.message,
      tokensRemaining: remainingTokens
    });

  } catch (error) {
    console.error("❌ API Route Error:", error);
    return NextResponse.json(
      { 
        status: "ERROR", 
        message: "Internal server error during medicine analysis." 
      },
      { status: 500 }
    );
  }
}

/**
 * Health Check Endpoint
 * GET /api/analyze-medicine-gemini
 */
export async function GET() {
  return NextResponse.json({ 
    status: "OK", 
    message: "Gemini 1.5 Pro API is running",
    endpoint: "/api/analyze-medicine-gemini",
    timestamp: new Date().toISOString()
  });
}
