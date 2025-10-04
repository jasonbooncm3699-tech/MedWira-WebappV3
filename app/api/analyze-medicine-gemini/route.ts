/**
 * Next.js API Route for Gemini 1.5 Pro Medicine Analysis
 * 
 * This endpoint integrates with the Gemini 1.5 Pro pipeline for medicine analysis
 * with NPRA database integration and token management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runGeminiPipeline } from '@/src/services/geminiAgent';
import { geminiAnalyzer } from '@/lib/gemini-service';
import { DatabaseService } from '@/lib/supabase';

// Type definitions for the Gemini pipeline response
interface GeminiPipelineResponse {
  status: "SUCCESS" | "ERROR" | "INSUFFICIENT_TOKENS" | "SERVICE_ERROR" | "SERVICE_UNAVAILABLE";
  message?: string;
  data?: any;
  httpStatus?: number;
}

export async function POST(request: NextRequest) {
  console.log('🔍 [API] Gemini 1.5 Pro Medicine Analysis API Request received');
  
  try {
    // Parse request body
    console.log('🔍 [API] Parsing request body...');
    const body = await request.json();
    const { image_data, user_id, text_query } = body;
    console.log('🔍 [API] Request body parsed successfully');
    
    // Validate required parameters
    if (!image_data && !text_query) {
      console.log('❌ [API] Missing required parameters: image_data or text_query');
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
      console.error('❌ [API] CRITICAL: Invalid or missing user_id in request body:', user_id);
      return NextResponse.json(
        { 
          status: "ERROR", 
          message: "Authentication failure: Invalid user ID provided. Please log in again." 
        },
        { status: 401 } // Use 401 Unauthorized for authentication issues
      );
    }

    console.log(`🔍 [API] Request validation passed. Details:`, {
      user_id: user_id,
      user_id_type: typeof user_id,
      user_id_length: user_id.length,
      has_image_data: !!image_data,
      image_data_length: image_data?.length || 0,
      has_text_query: !!text_query,
      text_query_length: text_query?.length || 0
    });

    // NEW: Image validation to detect medicine packaging before processing
    if (image_data) {
      console.log(`🔍 [API] Validating image for medicine packaging...`);
      try {
        const validationResult = await geminiAnalyzer.validateMedicineImage(image_data);
        console.log(`🔍 [API] Image validation result:`, validationResult);
        
        if (!validationResult.isValid || validationResult.confidence < 0.3) {
          console.log(`❌ [API] Image validation failed - not medicine packaging`);
          return NextResponse.json(
            { 
              status: "ERROR", 
              message: "The image uploaded isn't medicine related. Please reupload a new medicine image for analysis.",
              validation_failed: true,
              confidence: validationResult.confidence
            },
            { status: 400 }
          );
        }
        
        console.log(`✅ [API] Image validation passed - medicine packaging detected`);
      } catch (validationError) {
        console.error(`❌ [API] Image validation error:`, validationError);
        // Continue with processing if validation fails (fallback behavior)
        console.log(`⚠️ [API] Continuing with processing despite validation error`);
      }
    }

    console.log(`🚀 [API] Starting Gemini 1.5 Pro pipeline for user: ${user_id}`);
    
    // Call the Gemini 1.5 Pro pipeline
    console.log(`🔍 [API] About to call runGeminiPipeline with user: ${user_id}`);
    let result: GeminiPipelineResponse;
    try {
      result = await runGeminiPipeline(image_data, text_query, user_id) as GeminiPipelineResponse;
      console.log(`✅ [API] runGeminiPipeline completed successfully`);
    } catch (pipelineError) {
      console.error(`❌ [API] runGeminiPipeline failed with error:`, pipelineError);
      return NextResponse.json(
        { 
          status: "SERVICE_ERROR", 
          message: "Gemini pipeline execution failed." 
        },
        { status: 503 }
      );
    }
    
    console.log(`📊 [API] Pipeline result status: ${result.status}`, {
      hasMessage: !!result.message,
      hasData: !!result.data,
      httpStatus: result.httpStatus
    });
    
    // 1. CRITICAL: Handle Insufficient Tokens (Payment Required)
    if (result.status === "INSUFFICIENT_TOKENS") {
      console.log(`❌ [API] Token failure for user ${user_id}. Returning 402.`);
      
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
      console.error(`❌ [API] Service unavailable for user ${user_id}: ${result.message}`);
      return NextResponse.json(
        { status: result.status, message: result.message },
        { status: 503 } // Service Unavailable
      );
    }

    // 3. Handle all other pipeline errors
    if (result.status === "ERROR" || result.status === "SERVICE_ERROR") {
      console.error(`❌ [API] Pipeline returned general error for user ${user_id}: ${result.message}`);
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

    console.log('✅ [API] Pipeline completed successfully');
    
    // NEW: Save scan history to database if processing was successful
    if (result.status === "SUCCESS" && user_id && result.data) {
      try {
        console.log(`🔍 [API] Saving scan history for user: ${user_id}`);
        
        // Extract medicine information from the result
        const medicineData = result.data.data || result.data;
        const medicineName = medicineData.medicine_name || 'Unknown Medicine';
        const genericName = medicineData.generic_name || '';
        const dosage = medicineData.dosage_instructions || medicineData.dosage || '';
        const sideEffects = medicineData.side_effects || [];
        const interactions = medicineData.drug_interactions || [];
        const warnings = medicineData.safety_notes || [];
        const storage = medicineData.storage || '';
        
        await DatabaseService.saveScanHistory({
          user_id: user_id,
          image_url: image_data || '',
          medicine_name: medicineName,
          generic_name: genericName,
          dosage: dosage,
          side_effects: Array.isArray(sideEffects) ? sideEffects : [sideEffects],
          interactions: Array.isArray(interactions) ? interactions : [interactions],
          warnings: Array.isArray(warnings) ? warnings : [warnings],
          storage: storage,
          category: 'Medicine',
          confidence: 0.85,
          language: 'English',
          allergies: ''
        });
        
        console.log(`✅ [API] Scan history saved successfully for medicine: ${medicineName}`);
      } catch (historyError) {
        console.error('❌ [API] Error saving scan history:', historyError);
        // Don't fail the request if saving history fails
      }
    }
    
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
    console.error("❌ [API] API Route Error:", error);
    console.error("❌ [API] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
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
