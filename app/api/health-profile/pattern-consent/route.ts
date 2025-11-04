import { NextRequest, NextResponse } from 'next/server';
import { HealthProfileService } from '@/lib/health-profile-service';

/**
 * Phase 2.3: Pattern Consent API
 * 
 * Handles user consent to save health patterns
 * POST /api/health-profile/pattern-consent
 * 
 * Body:
 * {
 *   userId: string,
 *   symptom: string,
 *   trigger: string,
 *   consent: boolean (true = save, false = don't save)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, symptom, trigger, consent } = body;

    // Validate input
    if (!userId || !symptom || !trigger || typeof consent !== 'boolean') {
      return NextResponse.json(
        {
          status: 'ERROR',
          error: 'Missing required fields: userId, symptom, trigger, consent (boolean)'
        },
        { status: 400 }
      );
    }

    // If user consents, save the pattern
    if (consent) {
      try {
        const success = await HealthProfileService.addHealthPattern(
          userId,
          {
            symptom,
            trigger,
            frequency: 1 // Initial frequency
          }
        );

        if (success) {
          console.log('✅ [Phase 2.3] Pattern saved with user consent:', {
            userId,
            symptom,
            trigger
          });

          return NextResponse.json({
            status: 'SUCCESS',
            message: 'Pattern saved successfully',
            data: {
              symptom,
              trigger,
              saved: true
            }
          });
        } else {
          return NextResponse.json(
            {
              status: 'ERROR',
              error: 'Failed to save pattern'
            },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('❌ [Phase 2.3] Error saving pattern:', error);
        return NextResponse.json(
          {
            status: 'ERROR',
            error: 'Internal server error while saving pattern'
          },
          { status: 500 }
        );
      }
    } else {
      // User declined - just log and return success (no action needed)
      console.log('ℹ️ [Phase 2.3] User declined to save pattern:', {
        userId,
        symptom,
        trigger
      });

      return NextResponse.json({
        status: 'SUCCESS',
        message: 'Pattern not saved (user declined)',
        data: {
          symptom,
          trigger,
          saved: false
        }
      });
    }
  } catch (error) {
    console.error('❌ [Phase 2.3] API Error:', error);
    
    return NextResponse.json(
      {
        status: 'ERROR',
        error: 'Internal server error. Please try again.'
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

