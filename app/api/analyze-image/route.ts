import { NextRequest, NextResponse } from 'next/server';
import { geminiAnalyzer } from '@/lib/gemini-service';
import { DatabaseService } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, language = 'English', allergy, userId } = body;

    // Validate input
    if (!imageBase64) {
      return NextResponse.json(
        { 
          success: false, 
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
          success: false, 
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
          success: false, 
          error: 'Invalid image format. Please upload a JPEG or PNG image.',
          language 
        },
        { status: 400 }
      );
    }

    // Check user token balance if user is logged in
    if (userId) {
      try {
        const user = await DatabaseService.getUser(userId);
        if (user.tokens <= 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'No tokens remaining. Please upgrade your plan or wait for daily reset.',
              language 
            },
            { status: 402 }
          );
        }
      } catch (error) {
        console.error('Error checking user tokens:', error);
        // Continue without token check if user lookup fails
      }
    }

    // Analyze the image
    const result = await geminiAnalyzer.analyzeMedicineImage(
      imageBase64,
      language,
      allergy || ''
    );

    // Save scan history if user is logged in and analysis was successful
    if (userId && result.success) {
      try {
        await DatabaseService.saveScanHistory({
          user_id: userId,
          image_url: imageBase64, // In production, upload to Supabase Storage
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
        });

        // Deduct token if user is logged in
        if (userId) {
          const user = await DatabaseService.getUser(userId);
          await DatabaseService.updateUser(userId, {
            tokens: Math.max(0, user.tokens - 1)
          });
        }
      } catch (error) {
        console.error('Error saving scan history:', error);
        // Don't fail the request if saving history fails
      }
    }

    // Return the result
    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error. Please try again.',
        language: 'English' 
      },
      { status: 500 }
    );
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
