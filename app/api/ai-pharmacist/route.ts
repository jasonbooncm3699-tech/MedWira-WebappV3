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
    console.log('🔍 [DEBUG] ===== CHAT HISTORY SAVE DEBUG START =====');
    console.log('🔍 [DEBUG] Save conditions check:', {
      userId: userId,
      userIdType: typeof userId,
      userIdLength: userId?.length,
      resultSuccess: result.success,
      resultSuccessType: typeof result.success,
      resultMessage: result.message?.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });
    
    if (userId && result.success) {
      // CRITICAL: Save SYNCHRONOUSLY to ensure it actually happens
      try {
        // Generate ONE session ID for this conversation
        const sessionId = generateSessionId();
        console.log('🔍 [DEBUG] Generated session ID:', sessionId);
        
        console.log('🔍 [DEBUG] About to save user message to database');
        // Save user message
        await saveChatMessage({
          user_id: userId,
          message_text: userMessage,
          message_type: 'user',
          image_url: imageBase64 || null,
          session_id: sessionId,
          message_sequence: 1
        });

        console.log('🔍 [DEBUG] About to save AI response to database');
        // Save AI response with SAME session ID
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
          session_id: sessionId, // SAME session ID
          message_sequence: 2
        });

        console.log('✅ AI response saved to database');
        console.log('✅ Conversation saved to chat history successfully');
      } catch (error) {
        console.error('❌ CRITICAL ERROR saving conversation to chat history:', error);
        // Don't throw - we still want to return the AI response even if save fails
      }

      // Deduct token after successful analysis
      try {
        const success = await decrementToken(userId);
        if (success) {
          console.log(`✅ Token deducted for user ${userId}`);
        }
      } catch (error) {
        console.error('Error deducting token:', error);
      }
    }

    // Return the result
    if (result.success) {
      // Note: Chat history saving is now handled synchronously above to ensure it actually happens

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
  // Use built-in crypto.randomUUID() for proper UUID format
  return crypto.randomUUID();
}
