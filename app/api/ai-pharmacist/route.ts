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
          image_url: imageBase64 || '', // Use empty string instead of null for NOT NULL constraint
          session_id: sessionId,
          message_sequence: 1
        });

        console.log('🔍 [DEBUG] About to save AI response to database');
        
        // Generate conversation metadata
        const conversationTitle = generateConversationTitle(userMessage, result.message || result.pharmacistAdvice || '');
        const conversationPreview = generateConversationPreview(result.message || result.pharmacistAdvice || '');
        const conversationTags = generateConversationTags(userMessage, result);
        
        // Extract medical data from AI response for text chats
        const medicalData = extractMedicalDataFromResponse(result);
        
        // Save AI response with SAME session ID and metadata
        await saveChatMessage({
          user_id: userId,
          message_text: result.message || result.pharmacistAdvice || 'AI response',
          message_type: 'ai',
          ai_response: result.message || result.pharmacistAdvice || '',
          image_url: '', // CRITICAL: Use empty string for AI responses (text-only)
          conversation_title: conversationTitle,
          conversation_preview: conversationPreview,
          conversation_tags: conversationTags,
          // Medical data extraction for text chats
          medicine_name: medicalData.medicineName,
          generic_name: medicalData.genericName,
          dosage: medicalData.dosage,
          side_effects: medicalData.sideEffects,
          interactions: medicalData.interactions,
          warnings: medicalData.warnings,
          storage: medicalData.storage,
          category: medicalData.category,
          confidence: medicalData.confidence,
          allergies: medicalData.allergies,
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
  conversation_title?: string;
  conversation_preview?: string;
  conversation_tags?: string[];
  medicine_name?: string;
  generic_name?: string;
  dosage?: string;
  side_effects?: string[];
  interactions?: string[];
  warnings?: string[];
  storage?: string;
  category?: string;
  confidence?: number;
  language?: string;
  allergies?: string;
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
        message_sequence: messageData.message_sequence,
        conversation_title: messageData.conversation_title,
        conversation_preview: messageData.conversation_preview,
        conversation_tags: messageData.conversation_tags,
        medicine_name: messageData.medicine_name,
        generic_name: messageData.generic_name,
        dosage: messageData.dosage,
        side_effects: messageData.side_effects,
        interactions: messageData.interactions,
        warnings: messageData.warnings,
        storage: messageData.storage,
        category: messageData.category,
        confidence: messageData.confidence,
        language: messageData.language,
        allergies: messageData.allergies
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

// Generate friendly conversation title
function generateConversationTitle(userMessage: string, aiResponse: string): string {
  // Make titles more conversational and friendly (like ChatGPT/Gemini)
  const friendlyTitles: { [key: string]: string } = {
    // Medicine interactions
    'medicine.*alcohol|alcohol.*medicine': 'Can I drink alcohol with my medicine?',
    'medicine.*coffee|coffee.*medicine': 'Is it safe to take medicine with coffee?',
    'paracetamol.*coffee|coffee.*paracetamol': 'Can I take paracetamol with coffee?',
    'vitamin.*coffee|coffee.*vitamin': 'Will vitamin C work with my coffee?',
    
    // Surgery and medications
    'medicine.*surgery|surgery.*medicine': 'What medicines should I avoid before surgery?',
    'before.*surgery|surgery.*before': 'What should I avoid before surgery?',
    
    // General medicine questions
    'side.*effect|effect.*side': 'What are the side effects?',
    'dosage|dose|how much': 'How much should I take?',
    'interaction|interact': 'Will this interact with other medicines?',
    'safe.*take|take.*safe': 'Is it safe to take this?',
    'when.*take|take.*when': 'When should I take this medicine?',
    'how.*take|take.*how': 'How should I take this medicine?'
  };
  
  // Check for pattern matches and return friendly titles
  const lowerText = userMessage.toLowerCase();
  for (const [pattern, friendlyTitle] of Object.entries(friendlyTitles)) {
    if (new RegExp(pattern).test(lowerText)) {
      return friendlyTitle;
    }
  }
  
  // If no pattern matches, create a friendly title from the first sentence
  const firstSentence = userMessage.split('.')[0];
  const words = firstSentence.split(' ');
  
  // Convert question to statement for title
  if (firstSentence.includes('?')) {
    const questionWords = ['what', 'how', 'can', 'should', 'is', 'are', 'will', 'would'];
    const filteredWords = words.filter(word => !questionWords.includes(word.toLowerCase()));
    const title = filteredWords.slice(0, 8).join(' ');
    return title.length > 50 ? title.substring(0, 50) + '...' : title;
  }
  
  // For statements, use first few words
  const title = words.slice(0, 6).join(' ');
  return title.length > 50 ? title.substring(0, 50) + '...' : title;
}

// Generate conversation preview (like Gemini)
function generateConversationPreview(aiResponse: string): string {
  if (!aiResponse) return '';
  
  // Extract first meaningful sentence from AI response
  const sentences = aiResponse.split('\n').filter((line: string) => line.trim().length > 0);
  
  // Find the first sentence that's not a header or formatting
  for (const line of sentences) {
    const trimmedLine = line.trim();
    
    // Skip headers and formatting
    if (trimmedLine.startsWith('**') || 
        trimmedLine.startsWith('#') || 
        trimmedLine.startsWith('•') ||
        trimmedLine.startsWith('-') ||
        trimmedLine.length < 10) {
      continue;
    }
    
    // Take the first meaningful sentence
    const firstSentence = trimmedLine.split('.')[0] + '.';
    if (firstSentence.length > 10) {
      return firstSentence.length > 100 
        ? firstSentence.substring(0, 100) + '...'
        : firstSentence;
    }
  }
  
  // Fallback: take first 100 characters
  const fallback = aiResponse.substring(0, 100);
  return fallback.length < aiResponse.length ? fallback + '...' : fallback;
}

// Generate conversation tags
function generateConversationTags(userMessage: string, result: any): string[] {
  const tags = new Set<string>();
  
  const text = (userMessage + ' ' + (result.message || result.pharmacistAdvice || '')).toLowerCase();
  
  // Medical topic tags
  if (text.includes('interaction')) tags.add('INTERACTION');
  if (text.includes('dosage') || text.includes('dose')) tags.add('DOSAGE');
  if (text.includes('side effect')) tags.add('SIDE EFFECTS');
  if (text.includes('allergy')) tags.add('ALLERGY');
  if (text.includes('surgery')) tags.add('SURGERY');
  if (text.includes('alcohol')) tags.add('ALCOHOL');
  if (text.includes('vitamin')) tags.add('VITAMIN');
  if (text.includes('medicine') || text.includes('medication')) tags.add('MEDICINE');
  if (text.includes('coffee') || text.includes('caffeine')) tags.add('CAFFEINE');
  if (text.includes('pregnancy') || text.includes('pregnant')) tags.add('PREGNANCY');
  if (text.includes('child') || text.includes('children')) tags.add('PEDIATRIC');
  
  // Default tag if no specific tags found
  if (tags.size === 0) tags.add('GENERAL');
  
  return Array.from(tags);
}

// Extract medical data from AI response for text chats
function extractMedicalDataFromResponse(result: any): any {
  const response = result.message || result.pharmacistAdvice || '';
  
  // Extract medicine name from response
  const medicineNameMatch = response.match(/(?:medicine|medication|drug|tablet|capsule|pill)\s+(?:name|is|called)?\s*:?\s*([A-Za-z0-9\s]+)/i);
  const medicineName = medicineNameMatch ? medicineNameMatch[1].trim() : result.medicineName || null;
  
  // Extract side effects
  const sideEffectsMatch = response.match(/side\s+effects?[:\s]*([^.]+)/i);
  const sideEffects = sideEffectsMatch ? [sideEffectsMatch[1].trim()] : undefined;
  
  // Extract interactions
  const interactionsMatch = response.match(/interactions?[:\s]*([^.]+)/i);
  const interactions = interactionsMatch ? [interactionsMatch[1].trim()] : undefined;
  
  // Extract warnings
  const warningsMatch = response.match(/warnings?[:\s]*([^.]+)/i);
  const warnings = warningsMatch ? [warningsMatch[1].trim()] : undefined;
  
  return {
    medicineName,
    genericName: result.genericName || null,
    dosage: result.dosage || null,
    sideEffects,
    interactions,
    warnings,
    storage: result.storage || null,
    category: result.category || null,
    confidence: result.confidence || null,
    allergies: result.allergies || null
  };
}
