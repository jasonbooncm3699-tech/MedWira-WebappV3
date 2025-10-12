import { NextRequest, NextResponse } from 'next/server';
import { aiPharmacist } from '@/lib/ai-pharmacist-service';
import { checkTokenAvailability, decrementToken } from '@/lib/npraDatabase';
import { chatHistoryManager } from '@/lib/chat-history-manager';

// Increase Vercel timeout for comprehensive analysis
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userMessage, 
      imageBase64, 
      userId, 
      language = 'English',
      userContext 
    } = body;

    console.log('🤖 AI Pharmacist API called:', {
      hasMessage: !!userMessage,
      hasImage: !!imageBase64,
      userId: userId ? 'provided' : 'missing',
      language,
      hasContext: !!userContext
    });

    // Validate required fields
    if (!userMessage || !userId) {
      return NextResponse.json({
        status: 'ERROR',
        error: 'Missing required fields: userMessage, userId',
        language
      }, { status: 400 });
    }

    // Check user token balance
    try {
      const hasTokens = await checkTokenAvailability(userId);
      if (!hasTokens) {
        return NextResponse.json({
          status: 'ERROR',
          error: 'No tokens remaining. Please upgrade your plan or wait for daily reset.',
          language
        }, { status: 402 });
      }
    } catch (error) {
      console.error('Error checking user tokens:', error);
      return NextResponse.json({
        status: 'ERROR',
        error: 'Token validation failed. Please try again.',
        language
      }, { status: 500 });
    }

    // Call AI Pharmacist service
    const result = await aiPharmacist.handleConversation(
      userMessage,
      imageBase64,
      userContext,
      language
    );

    // CRITICAL: Save chat history and deduct tokens asynchronously to avoid blocking AI response
    if (userId && result.success) {
      // Use setImmediate to defer non-critical operations
      setImmediate(async () => {
        try {
          // Save user message
          await saveChatMessage({
            user_id: userId,
            message_text: userMessage,
            message_type: 'user',
            image_url: imageBase64 || null,
            session_id: generateSessionId(),
            message_sequence: 1
          });

          // Save AI response
          await saveChatMessage({
            user_id: userId,
            message_text: result.message || result.pharmacistAdvice || 'AI response',
            message_type: 'ai',
            ai_response: result.message || result.pharmacistAdvice || '',
            conversation_context: JSON.stringify({
              medicineName: result.medicineName,
              messageType: result.messageType,
              confidence: result.confidence
            }),
            session_id: generateSessionId(),
            message_sequence: 2
          });

          console.log('✅ Conversation saved to chat history (async)');
        } catch (error) {
          console.error('Error saving conversation (async):', error);
        }

        // Deduct token after successful analysis
        try {
          const success = await decrementToken(userId);
          if (success) {
            console.log(`✅ Token deducted for user ${userId} (async)`);
          }
        } catch (error) {
          console.error('Error deducting token (async):', error);
        }
      });
    }

    // Return the result
    if (result.success) {
      // Save conversation to unified chat history (async, don't block response)
      if (userId) {
        // Generate session ID (in real implementation, this should come from frontend)
        const sessionId = chatHistoryManager.generateSessionId();
        
        // Save conversation asynchronously
        setImmediate(async () => {
          try {
            await chatHistoryManager.saveConversation(
              userId,
              sessionId,
              userMessage,
              result.message || result.pharmacistAdvice || result.rawAnalysis || 'AI Pharmacist consultation complete',
              1, // message sequence
              {
                medicine_name: result.medicineName,
                generic_name: result.genericName,
                side_effects: Array.isArray(result.sideEffects) ? result.sideEffects : (result.sideEffects ? [result.sideEffects] : undefined),
                interactions: Array.isArray(result.drugInteractions) ? result.drugInteractions : (result.drugInteractions ? [result.drugInteractions] : undefined),
                warnings: Array.isArray(result.safetyNotes) ? result.safetyNotes : (result.safetyNotes ? [result.safetyNotes] : undefined),
                dosage: result.dosageInstructions,
                storage: result.storage,
                confidence: result.confidence
              },
              imageBase64, // if image was provided
              language,
              userContext?.allergies?.join(', ')
            );
            console.log(`✅ AI Pharmacist conversation saved for user ${userId}, session ${sessionId}`);
          } catch (error) {
            console.error('Error saving AI Pharmacist conversation:', error);
          }
        });
      }

      return NextResponse.json({
        status: 'SUCCESS',
        data: {
          message: result.message,
          messageType: result.messageType,
          medicineName: result.medicineName,
          genericName: result.genericName,
          activeIngredients: result.activeIngredients,
          pharmacistAdvice: result.pharmacistAdvice,
          followUpQuestions: result.followUpQuestions,
          interactionAnalysis: result.interactionAnalysis,
          dosageInstructions: result.dosageInstructions,
          sideEffects: result.sideEffects,
          drugInteractions: result.drugInteractions,
          safetyNotes: result.safetyNotes,
          storage: result.storage,
          confidence: result.confidence,
          databaseVerified: result.databaseVerified,
          disclaimer: result.disclaimer,
          rawAnalysis: result.rawAnalysis
        },
        language: result.language
      });
    } else {
      return NextResponse.json({
        status: 'ERROR',
        error: result.error || 'AI Pharmacist consultation failed',
        language: result.language
      }, { status: 500 });
    }

  } catch (error) {
    console.error('AI Pharmacist API Error:', error);
    
    return NextResponse.json({
      status: 'ERROR',
      error: 'Internal server error. Please try again.',
      language: 'English'
    }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Helper function to save chat message
async function saveChatMessage(messageData: {
  user_id: string;
  message_text: string;
  message_type: string;
  image_url?: string | null;
  ai_response?: string;
  conversation_context?: string;
  session_id: string;
  message_sequence: number;
}) {
  try {
    // Import supabase client
    const { supabase } = await import('@/lib/supabase');

    // Save to chat_history table
    const { data, error } = await supabase
      .from('chat_history')
      .insert([{
        user_id: messageData.user_id,
        message_text: messageData.message_text,
        message_type: messageData.message_type,
        image_url: messageData.image_url,
        ai_response: messageData.ai_response,
        conversation_context: messageData.conversation_context,
        session_id: messageData.session_id,
        message_sequence: messageData.message_sequence
      }])
      .select();

    if (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }

    console.log('✅ Chat message saved successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to save chat message:', error);
    throw error;
  }
}

// Helper function to generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
