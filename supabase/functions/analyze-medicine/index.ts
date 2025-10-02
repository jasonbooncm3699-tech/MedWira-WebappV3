import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  imageBase64: string;
  userId: string;
  language?: string;
  allergy?: string;
}

interface AnalysisResult {
  success: boolean;
  status: 'SUCCESS' | 'ERROR';
  message?: string;
  data?: {
    packagingDetected: string;
    medicineName: string;
    purpose: string;
    dosageInstructions: string;
    sideEffects: string;
    allergyWarning: string;
    drugInteractions: string;
    safetyNotes: string;
    crossBorderInfo: string;
    storage: string;
    disclaimer: string;
  };
  tokensRemaining?: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, userId, language = 'English', allergy }: AnalysisRequest = await req.json()

    // Validate input
    if (!imageBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'No image provided. Please upload a medicine image.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'User authentication required.'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize Gemini AI
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('NEXT_PUBLIC_GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'AI service not configured. Please contact support.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    // Phase 1: Token Check and Deduction
    console.log('🔍 Phase 1: Checking user tokens...')
    
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('token_count')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'User profile not found. Please sign in again.'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (userProfile.token_count <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'You have run out of tokens. Please purchase more to continue using the AI analysis feature.',
          tokensRemaining: 0
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Deduct token immediately
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ 
        token_count: userProfile.token_count - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (deductError) {
      console.error('❌ Token deduction failed:', deductError)
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'Failed to process request. Please try again.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Token deducted successfully. Remaining:', userProfile.token_count - 1)

    // Phase 2: AI Multimodal Analysis (Image Verification)
    console.log('🔍 Phase 2: Analyzing image with AI...')
    
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    
    const analysisPrompt = `You are MedWira AI, a specialized medicine identification system. Analyze this image and provide comprehensive medicine information.

CRITICAL REQUIREMENTS:
1. VERIFY CONTENT: Strictly determine if this image contains identifiable medicine/pharmaceutical products
2. If NOT medicine-related, respond with: {"status": "ERROR", "message": "The uploaded photo does not appear to be medicine related. Please upload an image of a pill, packaging, or label."}
3. If YES medicine-related, extract and provide ALL requested information

For medicine images, analyze and extract:
- Medicine name, brand name, and generic name
- Active ingredients and dosages
- Manufacturer information
- Any visible packaging details

Respond with JSON format containing all required fields for comprehensive medicine analysis.`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    }

    const analysisResult = await model.generateContent([analysisPrompt, imagePart])
    const analysisResponse = await analysisResult.response
    const analysisText = analysisResponse.text()

    // Parse AI analysis response
    let medicineData
    try {
      const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       analysisText.match(/(\{[\s\S]*?\})/)
      
      if (jsonMatch) {
        medicineData = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('No valid JSON found in AI response')
      }

      // Check if AI detected non-medicine content
      if (medicineData.status === 'ERROR') {
        return new Response(
          JSON.stringify({
            success: false,
            status: 'ERROR',
            message: medicineData.message,
            tokensRemaining: userProfile.token_count - 1
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI analysis:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'Failed to analyze image. Please try with a clearer photo of medicine packaging.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Phase 3: Database and Web Search Integration
    console.log('🔍 Phase 3: Checking medicine database...')
    
    let databaseResults = []
    if (medicineData.medicineName || medicineData.genericName) {
      const searchTerms = [
        medicineData.medicineName,
        medicineData.genericName,
        ...(medicineData.activeIngredients || [])
      ].filter(Boolean)

      for (const term of searchTerms.slice(0, 3)) { // Limit to 3 searches
        try {
          const { data: dbResults } = await supabase
            .from('medicines')
            .select('*')
            .or(`product.ilike.%${term}%,generic_name.ilike.%${term}%,active_ingredient.ilike.%${term}%`)
            .limit(5)
          
          if (dbResults) {
            databaseResults.push(...dbResults)
          }
        } catch (dbError) {
          console.warn('Database search failed for term:', term, dbError)
        }
      }
    }

    // Phase 4: Comprehensive Analysis with Web Search Augmentation
    console.log('🔍 Phase 4: Augmenting data via web search...')
    
    const comprehensivePrompt = `You are MedWira AI providing comprehensive medicine analysis. Based on the image analysis and database results, create a detailed medicine information sheet.

IMAGE ANALYSIS DATA:
${JSON.stringify(medicineData, null, 2)}

DATABASE RESULTS:
${JSON.stringify(databaseResults.slice(0, 5), null, 2)}

USER ALLERGY INFO:
${allergy || 'None provided'}

REQUIRED OUTPUT FORMAT (JSON):
{
  "packagingDetected": "Description of packaging, markings, and visible information",
  "medicineName": "Full medicine name with active ingredients and dosages",
  "purpose": "Detailed purpose and medical uses",
  "dosageInstructions": "Comprehensive dosage instructions for different age groups",
  "sideEffects": "Common and rare side effects with overdose warnings",
  "allergyWarning": "Specific allergy warnings and contraindications",
  "drugInteractions": "Drug, food, and alcohol interactions",
  "safetyNotes": "Safety notes for special populations (children, pregnant women, etc.)",
  "crossBorderInfo": "Information about availability in other countries",
  "storage": "Storage requirements and conditions",
  "disclaimer": "Medical disclaimer and consultation recommendation"
}

IMPORTANT GUIDELINES:
- Be comprehensive and medically accurate
- Include specific dosage information when available
- Highlight important safety warnings
- Provide practical storage advice
- Always recommend consulting healthcare professionals
- Use the user's allergy information to provide specific warnings
- If database results are available, incorporate that information
- If information is not available, state "Information not available" rather than guessing`;

    const comprehensiveResult = await model.generateContent([comprehensivePrompt])
    const comprehensiveResponse = await comprehensiveResult.response
    const comprehensiveText = comprehensiveResponse.text()

    // Parse comprehensive analysis
    let finalAnalysis
    try {
      const jsonMatch = comprehensiveText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       comprehensiveText.match(/(\{[\s\S]*?\})/)
      
      if (jsonMatch) {
        finalAnalysis = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('No valid JSON found in comprehensive analysis')
      }
    } catch (parseError) {
      console.error('❌ Failed to parse comprehensive analysis:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ERROR',
          message: 'Failed to generate comprehensive analysis. Please try again.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Phase 5: Save to Scan History
    console.log('🔍 Phase 5: Saving scan history...')
    
    try {
      await supabase
        .from('scan_history')
        .insert({
          user_id: userId,
          image_url: imageBase64,
          medicine_name: finalAnalysis.medicineName,
          generic_name: medicineData.genericName,
          dosage: finalAnalysis.dosageInstructions,
          side_effects: [finalAnalysis.sideEffects],
          interactions: [finalAnalysis.drugInteractions],
          warnings: [finalAnalysis.allergyWarning, finalAnalysis.safetyNotes],
          storage: finalAnalysis.storage,
          category: 'Medicine Analysis',
          confidence: 0.95,
          language: language,
          allergies: allergy
        })
    } catch (historyError) {
      console.warn('⚠️ Failed to save scan history:', historyError)
      // Don't fail the request if history saving fails
    }

    // Return successful analysis
    const response: AnalysisResult = {
      success: true,
      status: 'SUCCESS',
      data: finalAnalysis,
      tokensRemaining: userProfile.token_count - 1
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Edge Function Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        status: 'ERROR',
        message: 'Internal server error. Please try again.',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
