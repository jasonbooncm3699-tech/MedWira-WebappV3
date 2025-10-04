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
  status: "SUCCESS" | "ERROR" | "INSUFFICIENT_TOKENS" | "SERVICE_ERROR" | "SERVICE_UNAVAILABLE";
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
    
    // CRITICAL FIX: Add explicit check for user_id validity
    if (!user_id || typeof user_id !== 'string' || user_id.length < 5) {
      console.error('❌ CRITICAL: Invalid or missing user_id in request body:', user_id);
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Authentication failure: Invalid user ID provided. Please log in again." 
        },
        { status: 401 } // Use 401 Unauthorized for authentication issues
      );
    }

    console.log(`🔍 API Request details:`, {
      user_id: user_id,
      user_id_type: typeof user_id,
      has_image_data: !!image_data,
      has_text_query: !!text_query
    });

    console.log(`🚀 Starting Gemini 1.5 Pro pipeline for user: ${user_id}`);
    
    // Call the Gemini 1.5 Pro pipeline
    const result = await runGeminiPipeline(image_data, text_query, user_id) as GeminiPipelineResponse;
    
    console.log(`📊 Pipeline result status: ${result.status}`);
    
    // 1. CRITICAL: Handle Insufficient Tokens (Payment Required)
    if (result.status === "INSUFFICIENT_TOKENS") {
      console.log(`❌ Token failure for user ${user_id}. Returning 402.`);
      
      // Get current token count for the error response
      let remainingTokens = null;
      if (user_id) {
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
      
      return NextResponse.json(
        { 
          status: result.status, 
          message: result.message,
          tokensRemaining: remainingTokens
        },
        { status: 402 } 
      );
    }

    // 2. Handle service unavailable errors
    if (result.status === "SERVICE_UNAVAILABLE") {
      console.error(`❌ Service unavailable for user ${user_id}: ${result.message}`);
      return NextResponse.json(
        { status: result.status, message: result.message },
        { status: 503 } // Service Unavailable
      );
    }

    // 3. Handle all other pipeline errors
    if (result.status === "ERROR" || result.status === "SERVICE_ERROR") {
      console.error(`❌ Pipeline returned general error for user ${user_id}: ${result.message}`);
      // Use the httpStatus provided by the pipeline, or default to appropriate status
      let httpStatus = result.httpStatus;
      if (!httpStatus) {
        if (result.status === "SERVICE_ERROR") {
          httpStatus = 503; // Service Unavailable
        } else {
          httpStatus = 500; // Internal Server Error
        }
      }
      
      return NextResponse.json(
        { status: result.status, message: result.message },
        { status: httpStatus } 
      );
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
  try {
    console.log('🔍 Testing Gemini 1.5 Pro API connection...');
    
    // Test Gemini API connection without using tokens
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100,
      }
    });

    // Simple test prompt
    const testPrompt = "Say 'API is working' if you can read this.";
    const response = await model.generateContent(testPrompt);
    const testResult = response.response.text();
    
    console.log('✅ Gemini 1.5 Pro API test successful:', testResult);
    
    return NextResponse.json({ 
      status: "HEALTHY", 
      message: "Gemini 1.5 Pro API is running and responding",
      endpoint: "/api/analyze-medicine-gemini",
      apiTest: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Gemini 1.5 Pro API test failed:', error);
    
    return NextResponse.json({ 
      status: "UNHEALTHY", 
      message: "Gemini 1.5 Pro API connection failed",
      endpoint: "/api/analyze-medicine-gemini",
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
