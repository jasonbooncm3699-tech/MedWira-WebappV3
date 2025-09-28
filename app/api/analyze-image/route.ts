import { NextRequest, NextResponse } from 'next/server';
import { geminiAnalyzer } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, language = 'English', allergy } = body;

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

    // Analyze the image
    const result = await geminiAnalyzer.analyzeMedicineImage(
      imageBase64,
      language,
      allergy || ''
    );

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
