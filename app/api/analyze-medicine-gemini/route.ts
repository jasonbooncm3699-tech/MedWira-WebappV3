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
    console.log('🔍 [API] ========== GEMINI MEDICINE ANALYSIS API REQUEST ==========');
    console.log('⏰ [API] Request received at:', new Date().toISOString());
    
    try {
        // Parse request body
        console.log('🔍 [API] Parsing request body...');
        const body = await request.json();
        const { image_data, user_id, text_query } = body;
        console.log('🔍 [API] Request body parsed successfully');
        console.log('📋 [API] Request details:', {
            hasImageData: !!image_data,
            imageDataLength: image_data?.length || 0,
            hasUserId: !!user_id,
            userIdLength: user_id?.length || 0,
            hasTextQuery: !!text_query,
            textQueryLength: text_query?.length || 0,
            textQuery: text_query
        });
    
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
    const pipelineStartTime = Date.now();
    
    // Call the Gemini 1.5 Pro pipeline
    console.log(`🔍 [API] About to call runGeminiPipeline with user: ${user_id}`);
    let result: GeminiPipelineResponse;
    try {
      result = await runGeminiPipeline(image_data, text_query, user_id) as GeminiPipelineResponse;
      const pipelineDuration = Date.now() - pipelineStartTime;
      console.log(`✅ [API] runGeminiPipeline completed successfully`);
      console.log(`⏱️ [API] Total pipeline duration: ${pipelineDuration}ms`);
    } catch (pipelineError) {
      const pipelineDuration = Date.now() - pipelineStartTime;
      console.error(`❌ [API] runGeminiPipeline failed after ${pipelineDuration}ms:`, pipelineError);
      console.error(`❌ [API] Pipeline error details:`, {
        message: pipelineError instanceof Error ? pipelineError.message : 'Unknown error',
        stack: pipelineError instanceof Error ? pipelineError.stack : 'No stack trace',
        name: pipelineError instanceof Error ? pipelineError.name : 'Unknown'
      });
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
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
      
      // Refund token if analysis failed after token was deducted
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Increment token back to user
        const { data: profile } = await supabase
          .from('profiles')
          .select('token_count')
          .eq('id', user_id)
          .single();
          
        if (profile) {
          await supabase
            .from('profiles')
            .update({ token_count: profile.token_count + 1 })
            .eq('id', user_id);
          console.log(`💰 [API] Token refunded to user ${user_id} due to analysis failure`);
        }
      } catch (refundError) {
        console.error('❌ [API] Failed to refund token:', refundError);
      }
      
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
    
    // Check if analysis was actually successful (not just API success)
    const isAnalysisSuccessful = result.status === "SUCCESS" && 
                                result.data && 
                                (result.data.medicine_name !== "N/A" && result.data.medicine_name !== "Unknown Medicine");
    
    console.log(`🔍 [API] Analysis success check:`, {
      status: result.status,
      hasData: !!result.data,
      medicineName: result.data?.medicine_name,
      isSuccessful: isAnalysisSuccessful
    });
    
    console.log(`📊 [API] Result data structure:`, {
      hasData: !!result.data,
      dataType: typeof result.data,
      dataKeys: result.data ? Object.keys(result.data) : [],
      hasMedicineName: !!(result.data?.medicine_name),
      hasGenericName: !!(result.data?.generic_name),
      hasPurpose: !!(result.data?.purpose),
      hasDosage: !!(result.data?.dosage_instructions),
      hasSideEffects: !!(result.data?.side_effects),
      hasInteractions: !!(result.data?.drug_interactions),
      hasSafetyNotes: !!(result.data?.safety_notes),
      hasStorage: !!(result.data?.storage)
    });
    
    // NEW: Save scan history to database if processing was successful AND medicine was identified
    if (isAnalysisSuccessful && user_id && result.data) {
      try {
        console.log(`🔍 [API] Saving scan history for user: ${user_id}`);
        
        // Extract medicine information from the result (handle nested structure)
        const medicineData = result.data.data || result.data;
        const medicineName = medicineData.medicine_name || 'Unknown Medicine';
        const genericName = medicineData.generic_name || '';
        const dosage = medicineData.dosage_instructions || medicineData.dosage || '';
        const sideEffects = medicineData.side_effects || '';
        const interactions = medicineData.drug_interactions || '';
        const warnings = medicineData.safety_notes || '';
        const storage = medicineData.storage || '';
        
        // Convert string fields to arrays for database storage
        const sideEffectsArray = typeof sideEffects === 'string' ? [sideEffects] : (Array.isArray(sideEffects) ? sideEffects : []);
        const interactionsArray = typeof interactions === 'string' ? [interactions] : (Array.isArray(interactions) ? interactions : []);
        const warningsArray = typeof warnings === 'string' ? [warnings] : (Array.isArray(warnings) ? warnings : []);
        
        await DatabaseService.saveScanHistory({
          user_id: user_id,
          image_url: image_data || '',
          medicine_name: medicineName,
          generic_name: genericName,
          dosage: dosage,
          side_effects: sideEffectsArray,
          interactions: interactionsArray,
          warnings: warningsArray,
          storage: storage,
          category: 'Medicine',
          confidence: 0.85,
          language: 'English',
          allergies: ''
        });
        
        console.log(`✅ [API] Scan history saved successfully for medicine: ${medicineName}`);
      } catch (historyError) {
        console.error('❌ [API] Error saving scan history:', historyError);
        console.error('❌ [API] Scan history error details:', {
          message: historyError instanceof Error ? historyError.message : 'Unknown error',
          stack: historyError instanceof Error ? historyError.stack : 'No stack trace',
          name: historyError instanceof Error ? historyError.name : 'Unknown',
          code: (historyError as any)?.code || 'Unknown',
          details: (historyError as any)?.details || null,
          hint: (historyError as any)?.hint || null
        });
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
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
    
    // Flatten the data structure for UI compatibility
    let flattenedData = result.data;
    if (result.data && result.data.data) {
      // If data is nested (result.data.data), flatten it
      flattenedData = {
        ...result.data.data,
        database_result: result.data.database_result,
        source: result.data.source
      };
      console.log(`🔧 [API] Flattened data structure for UI compatibility`);
      console.log(`📊 [API] Flattened data keys:`, Object.keys(flattenedData));
    }

    // Send the full result with status and remaining tokens
    console.log(`✅ [API] ========== API REQUEST COMPLETED SUCCESSFULLY ==========`);
    console.log(`⏰ [API] Request completed at: ${new Date().toISOString()}`);
    console.log(`📊 [API] Final response:`, {
      status: result.status,
      hasData: !!flattenedData,
      hasMessage: !!result.message,
      tokensRemaining: remainingTokens,
      dataKeys: flattenedData ? Object.keys(flattenedData) : []
    });
    
    return NextResponse.json({
      status: result.status,
      data: flattenedData,
      message: result.message,
      tokensRemaining: remainingTokens
    });

  } catch (error) {
    console.error("❌ [API] ========== API ROUTE ERROR ==========");
    console.error("❌ [API] API Route Error:", error);
    console.error("❌ [API] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("❌ [API] Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    console.error(`⏰ [API] Error occurred at: ${new Date().toISOString()}`);
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
