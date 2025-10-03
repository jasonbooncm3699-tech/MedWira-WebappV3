/**
 * Next.js API Route for MedGemma 4B Medicine Analysis
 * 
 * This endpoint integrates with the MedGemma pipeline for medicine analysis
 * with NPRA database integration and token management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runGeminiPipeline } from '@/src/services/geminiAgent';

export async function POST(request: NextRequest) {
  console.log('🔍 MedGemma Medicine Analysis API Request received');
  
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
    const result = await runGeminiPipeline(image_data, text_query, user_id);
    
    console.log(`📊 Pipeline result status: ${result.status}`);
    
    if (result.status === "ERROR") {
      // Use httpStatus if available (from token check), otherwise default to 500
      const statusCode = result.httpStatus || (result.message.includes('tokens') ? 402 : 500);
      console.log(`❌ Pipeline error (${statusCode}): ${result.message}`);
      return NextResponse.json(result, { status: statusCode });
    }

    console.log('✅ Pipeline completed successfully');
    
    // Send the final structured JSON back to the client
    return NextResponse.json(result.data);

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
 * GET /api/analyze-medicine-medgemma
 */
export async function GET() {
  return NextResponse.json({ 
    status: "OK", 
    message: "MedGemma API is running",
    endpoint: "/api/analyze-medicine-medgemma",
    timestamp: new Date().toISOString()
  });
}
