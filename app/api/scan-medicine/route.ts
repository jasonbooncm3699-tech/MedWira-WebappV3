import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
// DEPRECATED: Gemini integration being replaced with MedGemma 4B
import { geminiAnalyzer } from '@/lib/gemini-service';
import { DatabaseService } from '@/lib/supabase';

// Interface for the structured medicine data that matches StructuredMedicineReply component
interface StructuredMedicineData {
  dosage?: {
    title: string;
    content: string;
    details?: string[];
  };
  sideEffects?: {
    title: string;
    content: string;
    details?: string[];
  };
  interactions?: {
    title: string;
    content: string;
    details?: string[];
  };
  warnings?: {
    title: string;
    content: string;
    details?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { image_url, allergies, language = 'English' } = body;

    // Validate required fields
    if (!image_url) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Get Supabase client for server-side operations
    const supabase = await createClient();

    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user's token balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tokens, subscription_tier')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has sufficient tokens (1 token required for scan)
    if (userData.tokens < 1) {
      return NextResponse.json(
        { 
          error: 'Insufficient Tokens',
          message: 'You need at least 1 token to scan a medicine. Please purchase more tokens to continue.',
          tokens: userData.tokens,
          required: 1
        },
        { status: 402 }
      );
    }

    // Deduct 1 token from user's balance
    const { error: tokenError } = await supabase
      .from('users')
      .update({ tokens: userData.tokens - 1 })
      .eq('id', user.id);

    if (tokenError) {
      console.error('Error deducting tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to process payment' },
        { status: 500 }
      );
    }

    console.log(`✅ Token deducted: User ${user.id} now has ${userData.tokens - 1} tokens`);

    // Download and convert image to base64 for Gemini analysis
    let imageBase64: string;
    try {
      const imageResponse = await fetch(image_url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64String = Buffer.from(imageBuffer).toString('base64');
      imageBase64 = `data:image/jpeg;base64,${base64String}`;
    } catch (imageError) {
      console.error('Error processing image:', imageError);
      return NextResponse.json(
        { error: 'Failed to process image. Please ensure the image URL is accessible.' },
        { status: 400 }
      );
    }

    // Analyze medicine using Gemini AI
    console.log('🔍 Starting Gemini medicine analysis...');
    const analysisResult = await geminiAnalyzer.analyzeMedicineImage(
      imageBase64,
      language,
      allergies || ''
    );

    if (!analysisResult.success) {
      // Refund the token if analysis failed
      await supabase
        .from('users')
        .update({ tokens: userData.tokens })
        .eq('id', user.id);
      
      return NextResponse.json(
        { error: analysisResult.error || 'Medicine analysis failed' },
        { status: 400 }
      );
    }

    // Convert Gemini analysis result to structured format for StructuredMedicineReply component
    const structuredData: StructuredMedicineData = {
      dosage: analysisResult.dosageInstructions ? {
        title: 'Dosage & Administration',
        content: analysisResult.dosageInstructions,
        details: analysisResult.dosage ? [analysisResult.dosage] : undefined
      } : undefined,
      
      sideEffects: analysisResult.sideEffects && analysisResult.sideEffects.length > 0 ? {
        title: 'Potential Side Effects',
        content: Array.isArray(analysisResult.sideEffects) 
          ? analysisResult.sideEffects.join('. ') 
          : analysisResult.sideEffects,
        details: Array.isArray(analysisResult.sideEffects) ? analysisResult.sideEffects : undefined
      } : undefined,
      
      interactions: analysisResult.drugInteractions ? {
        title: 'Key Drug Interactions',
        content: analysisResult.drugInteractions,
        details: analysisResult.interactions || undefined
      } : undefined,
      
      warnings: (analysisResult.warnings && analysisResult.warnings.length > 0) || analysisResult.allergyWarning || analysisResult.safetyNotes ? {
        title: 'Warnings & Contraindications',
        content: [
          analysisResult.allergyWarning,
          analysisResult.safetyNotes,
          ...(analysisResult.warnings || [])
        ].filter(Boolean).join('. '),
        details: [
          ...(analysisResult.allergyWarning ? [`Allergy Warning: ${analysisResult.allergyWarning}`] : []),
          ...(analysisResult.safetyNotes ? [`Safety Notes: ${analysisResult.safetyNotes}`] : []),
          ...(analysisResult.warnings || [])
        ]
      } : undefined
    };

    // Save scan history to database
    try {
      await DatabaseService.saveScanHistory({
        user_id: user.id,
        image_url,
        medicine_name: analysisResult.medicineName,
        generic_name: analysisResult.genericName,
        dosage: analysisResult.dosageInstructions,
        side_effects: Array.isArray(analysisResult.sideEffects) ? analysisResult.sideEffects : (analysisResult.sideEffects ? [analysisResult.sideEffects] : []),
        interactions: analysisResult.interactions || [],
        warnings: analysisResult.warnings || [],
        storage: analysisResult.storage,
        category: analysisResult.category,
        confidence: analysisResult.confidence,
        language,
        allergies: allergies || ''
      });
    } catch (historyError) {
      console.error('Error saving scan history:', historyError);
      // Don't fail the request if history saving fails
    }

    // Return structured response
    return NextResponse.json({
      success: true,
      medicine: {
        name: analysisResult.medicineName,
        genericName: analysisResult.genericName,
        purpose: analysisResult.purpose,
        packagingDetected: analysisResult.packagingDetected,
        confidence: analysisResult.confidence,
        disclaimer: analysisResult.disclaimer
      },
      structuredData,
      tokensRemaining: userData.tokens - 1,
      language
    });

  } catch (error) {
    console.error('Scan medicine API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to scan medicine.' },
    { status: 405 }
  );
}
