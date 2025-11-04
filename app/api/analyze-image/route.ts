import { NextRequest, NextResponse } from 'next/server';
// UPDATED: Using Gemini 1.5 Pro for medicine analysis
import { geminiAnalyzer } from '@/lib/gemini-service';
import { DatabaseService } from '@/lib/supabase';
import { checkTokenAvailability, decrementToken, saveChatMessage } from '@/lib/npraDatabase';
import { HealthProfileService } from '@/lib/health-profile-service';
import { supabase } from '@/lib/supabase';

// Increase Vercel timeout to 120 seconds for comprehensive analysis
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, language = 'English', allergy, userId } = body;

    // Validate input
    if (!imageBase64) {
      return NextResponse.json(
        { 
          status: 'ERROR',
          error: 'No image provided. Please upload a medicine image.',
          language 
        },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json(
        { 
          status: 'ERROR',
          error: 'API key not configured. Please contact support.',
          language 
        },
        { status: 500 }
      );
    }

    // Validate image format
    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json(
        { 
          status: 'ERROR',
          error: 'Invalid image format. Please upload a JPEG or PNG image.',
          language 
        },
        { status: 400 }
      );
    }

    // Check user token balance if user is logged in
    if (userId) {
      try {
        const hasTokens = await checkTokenAvailability(userId);
        if (!hasTokens) {
          return NextResponse.json(
            { 
              status: 'ERROR',
              error: 'No tokens remaining. Please upgrade your plan or wait for daily reset.',
              language 
            },
            { status: 402 }
          );
        }
      } catch (error) {
        console.error('Error checking user tokens:', error);
        // Continue without token check if user lookup fails - user might not exist yet
        console.log('Continuing analysis without token check - user profile may not exist');
      }
    }

    // Analyze the image using the comprehensive 10-step flow
    console.log('🚀 Starting comprehensive medicine analysis with 10-step flow');
    const result = await geminiAnalyzer.analyzeMedicineImageWithStatus(
      imageBase64,
      language,
      allergy || '',
      (status: string) => {
        console.log(`📊 Analysis status: ${status}`);
      }
    );

    // Only deduct token and save history if analysis was successful
    if (userId && result.success) {
      // Save to unified chat history (separate from token deduction)
      try {
        // Generate session ID for this conversation (or use existing one)
        const sessionId = crypto.randomUUID();
        
        // Save user message (image upload)
        await saveChatMessage({
          user_id: userId,
          message_type: 'user',
          message_text: 'Uploaded medicine image for analysis',
          session_id: sessionId,
          message_sequence: 1,
          image_url: imageBase64, // In production, upload to Supabase Storage
          language,
          allergies: allergy || null,
        });
        
        // Save AI response
        await saveChatMessage({
          user_id: userId,
          message_type: 'ai',
          ai_response: result.rawAnalysis,
          session_id: sessionId,
          message_sequence: 2,
          medicine_name: result.medicineName,
          generic_name: result.genericName,
          dosage: result.dosage,
          side_effects: result.sideEffects,
          interactions: result.interactions,
          warnings: result.warnings,
          storage: result.storage,
          category: result.category,
          confidence: result.confidence,
          language,
          allergies: allergy || null,
          conversation_context: `Medicine analysis: ${result.medicineName}`,
        });
        
        console.log(`✅ Chat history saved for user ${userId}, session ${sessionId}`);
      } catch (error) {
        console.error('Error saving chat history:', error);
        // Don't fail the request if saving history fails
      }

      // Phase 1 Enhancement: Extract keywords from image analysis and save to health profile
      // Extract in background (non-blocking)
      if (result.medicineName || result.genericName) {
        extractKeywordsFromImageAnalysis(userId, result).catch(error => {
          console.error('❌ Error extracting keywords from image analysis:', error);
          // Don't block response if extraction fails
        });
      }

      // Deduct token (separate from scan history)
      try {
        const success = await decrementToken(userId);
        if (success) {
          console.log(`✅ Token deducted for user ${userId}`);
        } else {
          console.log(`⚠️ User ${userId} has no tokens - skipping token deduction`);
        }
      } catch (error) {
        console.error('Error deducting token:', error);
        // Don't fail the request if token deduction fails
      }
    }

    // Return the result in the format expected by the frontend
    if (result.success) {
      // Phase 1 Enhancement: Check if medicine should be suggested for medication stack
      let suggestMedicationStack = false;
      let medicineDetails = null;
      
      if (userId && result.medicineName) {
        try {
          // Check if medicine is already in user's medication stack
          const isInStack = await checkIfInMedicationStack(userId, result.medicineName);
          
          if (!isInStack) {
            suggestMedicationStack = true;
            medicineDetails = {
              name: result.medicineName,
              genericName: result.genericName || null,
              dosage: result.dosage || null,
              activeIngredients: result.activeIngredients || null
            };
          }
        } catch (error) {
          console.warn('⚠️ Error checking medication stack (non-critical):', error);
          // Continue without suggestion if check fails
        }
      }

      return NextResponse.json({
        status: 'SUCCESS',
        data: {
          medicine_name: result.medicineName,
          generic_name: result.genericName,
          dosage: result.dosage,
          side_effects: result.sideEffects,
          interactions: result.interactions,
          warnings: result.warnings,
          storage: result.storage,
          category: result.category,
          confidence: result.confidence,
          language: result.language,
          // Enhanced fields
          packaging_detected: result.packagingDetected,
          purpose: result.purpose,
          database_verified: result.databaseVerified,
          active_ingredients: result.activeIngredients,
          raw_analysis: result.rawAnalysis,
          dosage_instructions: result.dosageInstructions,
          allergy_warning: result.allergyWarning,
          drug_interactions: result.drugInteractions,
          safety_notes: result.safetyNotes,
          disclaimer: result.disclaimer,
          // Phase 1 Enhancement: Medication stack suggestion
          suggest_medication_stack: suggestMedicationStack,
          medicine_details: medicineDetails
        },
        tokensRemaining: undefined // Will be set by frontend if needed
      });
    } else {
      return NextResponse.json({
        status: 'ERROR',
        error: result.error || 'Analysis failed',
        language: result.language
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        error: 'Internal server error. Please try again.',
        language: 'English' 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Phase 1 Enhancement: Extract keywords from image analysis
// ============================================================================

/**
 * Extract keywords from image analysis result and save to health profile
 * Runs in background (non-blocking)
 */
async function extractKeywordsFromImageAnalysis(
  userId: string,
  analysisResult: {
    medicineName?: string;
    genericName?: string;
    activeIngredients?: string;
    rawAnalysis?: string;
  }
): Promise<void> {
  try {
    console.log('🔍 [Phase 1 Enhancement] Extracting keywords from image analysis...');

    // Build keywords object from analysis result
    const medications: string[] = [];
    if (analysisResult.medicineName) {
      medications.push(analysisResult.medicineName.toLowerCase());
    }
    if (analysisResult.genericName) {
      medications.push(analysisResult.genericName.toLowerCase());
    }

    // Extract additional keywords from raw analysis if available
    // This could include conditions, symptoms mentioned in the analysis
    if (analysisResult.rawAnalysis) {
      // Use Gemini to extract keywords from analysis text
      // For now, just save medications - can enhance later to extract more
      const keywords = {
        medications: medications,
        symptoms: [],
        conditions: [],
        triggers: [],
        keywords: []
      };

      // Only save if we have medications
      if (medications.length > 0) {
        const success = await HealthProfileService.updateHealthKeywords(userId, keywords);
        
        if (success) {
          console.log('✅ [Phase 1 Enhancement] Keywords extracted and saved from image analysis:', {
            medications: medications.length
          });
        } else {
          console.error('❌ [Phase 1 Enhancement] Failed to save keywords from image analysis');
        }
      } else {
        console.log('ℹ️ [Phase 1 Enhancement] No medications extracted from image analysis');
      }
    }
  } catch (error) {
    console.error('❌ [Phase 1 Enhancement] Error extracting keywords from image analysis:', error);
  }
}

/**
 * Check if medicine is already in user's medication stack
 */
async function checkIfInMedicationStack(
  userId: string,
  medicineName: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_medication_stack')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .ilike('medicine_name', `%${medicineName}%`)
      .limit(1);

    if (error) {
      console.warn('⚠️ Error checking medication stack:', error);
      return false; // Assume not in stack if check fails
    }

    return (data && data.length > 0);
  } catch (error) {
    console.warn('⚠️ Exception checking medication stack:', error);
    return false; // Assume not in stack if check fails
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
