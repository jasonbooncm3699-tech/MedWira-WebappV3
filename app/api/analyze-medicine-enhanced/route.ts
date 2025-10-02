import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, userId, language = 'English', allergy } = body;

    // Validate input
    if (!imageBase64) {
      return NextResponse.json(
        { 
          success: false, 
          status: 'ERROR',
          message: 'No image provided. Please upload a medicine image.',
          language 
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          status: 'ERROR',
          message: 'User authentication required.',
          language 
        },
        { status: 401 }
      );
    }

    // Validate image format
    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json(
        { 
          success: false, 
          status: 'ERROR',
          message: 'Invalid image format. Please upload a JPEG or PNG image.',
          language 
        },
        { status: 400 }
      );
    }

    // Call Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { 
          success: false, 
          status: 'ERROR',
          message: 'Service configuration error. Please contact support.',
          language 
        },
        { status: 500 }
      );
    }

    console.log('🚀 Calling Supabase Edge Function for medicine analysis...');

    const edgeFunctionResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-medicine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        imageBase64,
        userId,
        language,
        allergy
      }),
    });

    const result = await edgeFunctionResponse.json();

    console.log('📊 Edge Function Response:', {
      success: result.success,
      status: result.status,
      hasData: !!result.data,
      tokensRemaining: result.tokensRemaining
    });

    // Return the result from the Edge Function
    return NextResponse.json(result, { 
      status: edgeFunctionResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('❌ Enhanced API Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        status: 'ERROR',
        message: 'Internal server error. Please try again.',
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
