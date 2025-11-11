import { NextRequest, NextResponse } from 'next/server';
import { aiPharmacist, ConversationContext as PharmacistConversationContext } from '@/lib/ai-pharmacist-service';
import { checkTokenAvailability, decrementToken } from '@/lib/npraDatabase';
import { chatHistoryManager } from '@/lib/chat-history-manager';
import { checkRateLimit } from '@/lib/rate-limiter';
import { 
  extractHealthKeywords, 
  HealthProfileService,
  detectPatterns,
  PatternCandidate,
  extractPersonalDetails // Phase 3.1: Personal details extraction
} from '@/lib/health-profile-service';

// Increase Vercel timeout for comprehensive analysis
// Increased to 60 seconds to allow time for AI response + background operations
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Track request start time for timeout protection
  const requestStartTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      userMessage, 
      imageBase64, 
      userId, 
      language = 'English',
      userContext,
      sessionId: clientSessionId
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

    // Check rate limit (prevent excessive API calls)
    if (!checkRateLimit(userId, 10)) {
      return NextResponse.json({
        status: 'ERROR',
        error: 'Too many requests. Please wait a moment before trying again.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        language
      }, { status: 429 });
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

    const sessionId = (typeof clientSessionId === 'string' && clientSessionId.trim().length > 0)
      ? clientSessionId
      : generateSessionId();

    let sessionMessages: any[] = [];
    try {
      sessionMessages = await chatHistoryManager.getSessionMessages(sessionId, userId);
    } catch (historyError) {
      console.warn('⚠️ Failed to load session messages:', historyError);
    }

    const conversationContext = buildConversationContext(sessionMessages);

    console.log('🧠 Conversation context prepared:', {
      sessionId,
      existingMessages: sessionMessages.length,
      hasLatestAnalysis: !!conversationContext.latestAnalysis,
      shouldAskForMedicine: conversationContext.shouldAskForMedicine
    });

    // Phase 2 Enhancement: Realistic status tracking
    // Create status callback that will be passed to frontend via WebSocket/SSE (future)
    // For now, we'll track stages internally but status display is handled by frontend
    const statusCallback = (stage: string) => {
      // Log status for debugging
      console.log(`📊 [AI Status] ${stage}`);
      // Future: Could send via WebSocket/SSE for real-time updates
    };

    // Call AI Pharmacist service (Phase 1.4: Now includes userId for health profile)
    const result = await aiPharmacist.handleConversation(
      userMessage,
      imageBase64,
      userContext,
      language,
      statusCallback, // Phase 2: Pass status callback for realistic tracking
      userId, // Phase 1.4: Pass userId for health profile loading
      conversationContext
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
        const userMessageSequence = sessionMessages.length + 1;
        const aiMessageSequence = userMessageSequence + 1;
        const existingConversation = sessionMessages[0];
        const existingTags = Array.isArray(existingConversation?.conversation_tags)
          ? existingConversation?.conversation_tags ?? []
          : [];
        
        console.log('🔍 [DEBUG] About to save user message to database');
        
        // Generate conversation metadata (generate once for the conversation)
        const conversationTitle = existingConversation?.conversation_title
          ? existingConversation.conversation_title
          : generateConversationTitle(userMessage, result.message || result.pharmacistAdvice || '');
        const conversationPreview = generateConversationPreview(result.message || result.pharmacistAdvice || '');
        const newTags = generateConversationTags(userMessage, result);
        const conversationTags = Array.from(new Set([...(existingTags || []), ...newTags]));
        
        console.log('🔍 [DEBUG] Generated conversation metadata:', {
          title: conversationTitle,
          preview: conversationPreview?.substring(0, 50) + '...',
          tags: conversationTags
        });
        
        // Save user message with conversation metadata
        await saveChatMessage({
          user_id: userId,
          message_text: userMessage,
          message_type: 'user',
          image_url: imageBase64 || '', // Use empty string instead of null for NOT NULL constraint
          session_id: sessionId,
          message_sequence: userMessageSequence,
          conversation_title: conversationTitle,
          conversation_preview: conversationPreview,
          conversation_tags: conversationTags
        });

        console.log('🔍 [DEBUG] About to save AI response to database');
        
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
          message_sequence: aiMessageSequence
        });

        console.log('✅ AI response saved to database');
        console.log('✅ Conversation saved to chat history successfully');
      } catch (error) {
        console.error('❌ CRITICAL ERROR saving conversation to chat history:', error);
        // Don't throw - we still want to return the AI response even if save fails
      }

      // Phase 1.4: Extract health keywords in background (non-blocking)
      // Phase 2.1: Also detect patterns in background
      // Only run background operations if we have enough time remaining (20+ seconds)
      // This prevents timeout issues - Vercel counts all promises against timeout
      const elapsedTime = Date.now() - requestStartTime;
      const timeRemaining = 60000 - elapsedTime; // 60 second timeout
      
      if (timeRemaining > 20000) {
        // We have more than 20 seconds remaining, safe to run background operations
        extractKeywordsAndDetectPatterns(userId, userMessage, language).catch(error => {
          console.error('❌ Error extracting keywords/detecting patterns in background:', error);
          // Don't block response if extraction fails
        });
      } else {
        console.log(`⚠️ Skipping background operations - only ${Math.round(timeRemaining / 1000)}s remaining`);
        // Background operations will be skipped to prevent timeout
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
      
      // Phase 2.1: Detect patterns synchronously for permission prompt
      // We do this synchronously so we can include pattern in response
      let detectedPattern: PatternCandidate | null = null;
      if (userId && userMessage) {
        try {
          // Extract keywords first (needed for pattern detection)
          // Phase 2 Enhancement: Status tracking for keyword extraction
          const keywordStatusCallback = (status: string) => {
            console.log(`📊 [Keyword Extraction Status] ${status}`);
          };
          const keywords = await extractHealthKeywords(userMessage, language, keywordStatusCallback);
          
          // Detect pattern if we have symptoms and triggers
          if (keywords.symptoms && keywords.symptoms.length > 0 && 
              keywords.triggers && keywords.triggers.length > 0) {
            // Phase 2 Enhancement: Status tracking for pattern detection
            // Create status callback for pattern detection
            const patternStatusCallback = (status: string) => {
              // Log pattern detection status
              console.log(`📊 [Pattern Detection Status] ${status}`);
              // Note: Could pass to frontend if needed
            };
            detectedPattern = await detectPatterns(userMessage, keywords, language, patternStatusCallback);
          }
        } catch (error) {
          console.warn('⚠️ Error detecting patterns (non-critical):', error);
          // Continue without pattern detection if it fails
        }
      }

      // Phase 2.2: Append permission prompt to AI response if pattern detected
      let finalMessage = result.message;
      if (detectedPattern && detectedPattern.confidence > 0.5) {
        // Format permission prompt based on language
        const permissionPrompt = formatPermissionPrompt(
          detectedPattern.symptom,
          detectedPattern.trigger,
          language
        );
        
        // Append to main message (after the answer)
        finalMessage = `${result.message}\n\n${permissionPrompt}`;
        
        console.log('✅ [Phase 2.2] Permission prompt added to response');
      }

      return NextResponse.json({
        status: 'SUCCESS',
        data: {
          message: finalMessage, // Use message with permission prompt if pattern detected
          messageType: result.messageType,
          sessionId,
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
          rawAnalysis: result.rawAnalysis,
          // Phase 2.1 & 2.2: Include detected pattern for permission prompt
          detectedPattern: detectedPattern && detectedPattern.confidence > 0.5 ? {
            symptom: detectedPattern.symptom,
            trigger: detectedPattern.trigger,
            confidence: detectedPattern.confidence
          } : null
        },
        language: result.language
      });
    } else {
      // Handle specific error types with appropriate status codes
      const errorCode = (result as any).error;
      let statusCode = 500;
      let errorMessage = result.error || result.message || 'AI Pharmacist consultation failed';
      
      // Return 503 Service Unavailable for quota errors (better than 500)
      if (errorCode === 'QUOTA_EXCEEDED') {
        statusCode = 503; // Service Unavailable
        errorMessage = result.message || 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.';
      } else if (errorCode === 'AUTH_ERROR') {
        statusCode = 503; // Service Unavailable (don't expose auth issues to users)
        errorMessage = 'AI service configuration error. Please contact support if this issue persists.';
      }
      
      return NextResponse.json({
        status: 'ERROR',
        error: errorMessage,
        errorCode: errorCode || 'UNKNOWN_ERROR',
        language: result.language
      }, { status: statusCode });
    }

  } catch (error: any) {
    console.error('AI Pharmacist API Error:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Internal server error. Please try again.';
    let errorCode = 'UNKNOWN_ERROR';
    
    // Check for quota errors in catch block
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.';
      errorCode = 'QUOTA_EXCEEDED';
    } else if (error?.status === 401 || error?.status === 403 || error?.message?.includes('API key')) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'AI service configuration error. Please contact support if this issue persists.';
      errorCode = 'AUTH_ERROR';
    }
    
    return NextResponse.json({
      status: 'ERROR',
      error: errorMessage,
      errorCode,
      language: 'English'
    }, { status: statusCode });
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

function buildConversationContext(messages: any[]): PharmacistConversationContext {
  if (!messages || messages.length === 0) {
    return {};
  }

  const recentMessages = messages
    .slice(-6)
    .map((msg: any) => {
      const content = msg.message_type === 'ai'
        ? (msg.ai_response || msg.message_text || '')
        : (msg.message_text || '');
      if (!content || content.trim().length === 0) {
        return null;
      }
      return {
        role: msg.message_type === 'ai' ? 'ai' as const : 'user' as const,
        content: content.trim()
      };
    })
    .filter(Boolean) as PharmacistConversationContext['recentMessages'];

  const latestAiMessage = [...messages]
    .reverse()
    .find((msg: any) => msg.message_type === 'ai' && ((msg.ai_response && msg.ai_response.trim()) || (msg.message_text && msg.message_text.trim())));

  const latestAnalysis = latestAiMessage
    ? {
        medicineName: latestAiMessage.medicine_name || latestAiMessage.generic_name || null,
        analysisText: (latestAiMessage.ai_response || latestAiMessage.message_text || '').trim()
      }
    : undefined;

  return {
    latestAnalysis,
    recentMessages,
    shouldAskForMedicine: messages.length > 0 && !latestAnalysis
  };
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

// Phase 1.4 & 2.1 & 3.1: Background keyword extraction, pattern detection, and personal details extraction (non-blocking)
async function extractKeywordsAndDetectPatterns(
  userId: string, 
  userMessage: string,
  language: string = 'English'
): Promise<void> {
  try {
    console.log('🔍 [Phase 1.4 & 2.1 & 3.1] Extracting keywords, detecting patterns, and extracting personal details in background...');
    
    // Extract keywords using Gemini
    // Note: Status tracking for keyword extraction (background, non-blocking)
    const keywords = await extractHealthKeywords(userMessage, language);
    
    // Phase 3.1: Extract personal details
    const personalDetails = await extractPersonalDetails(userMessage, language);
    
    // Check if personal details were extracted
    const hasPersonalDetails = 
      (personalDetails.age !== null && personalDetails.age !== undefined) ||
      personalDetails.sex !== null ||
      (personalDetails.known_conditions && personalDetails.known_conditions.length > 0) ||
      personalDetails.past_medical_history !== null ||
      personalDetails.family_history !== null;
    
    // Save personal details if any were extracted
    if (hasPersonalDetails) {
      const success = await HealthProfileService.updatePersonalDetails(userId, {
        age: personalDetails.age !== null && personalDetails.age !== undefined ? personalDetails.age : undefined,
        sex: personalDetails.sex || undefined,
        known_conditions: personalDetails.known_conditions || undefined,
        past_history: personalDetails.past_medical_history || undefined,
        family_history: personalDetails.family_history || undefined
      });
      
      if (success) {
        console.log('✅ [Phase 3.1] Personal details extracted and saved:', {
          age: personalDetails.age || 'none',
          sex: personalDetails.sex || 'none',
          known_conditions: personalDetails.known_conditions?.length || 0,
          past_history: personalDetails.past_medical_history ? 'yes' : 'no',
          family_history: personalDetails.family_history ? 'yes' : 'no'
        });
      } else {
        console.error('❌ [Phase 3.1] Failed to save personal details');
      }
    }
    
    // Check if any keywords were extracted
    const hasKeywords = 
      (keywords.symptoms && keywords.symptoms.length > 0) ||
      (keywords.conditions && keywords.conditions.length > 0) ||
      (keywords.medications && keywords.medications.length > 0) ||
      (keywords.triggers && keywords.triggers.length > 0) ||
      (keywords.keywords && keywords.keywords.length > 0);
    
    if (hasKeywords) {
      // Update health profile with extracted keywords
      const success = await HealthProfileService.updateHealthKeywords(userId, keywords);
      
      if (success) {
        console.log('✅ [Phase 1.4] Health keywords extracted and saved:', {
          symptoms: keywords.symptoms?.length || 0,
          conditions: keywords.conditions?.length || 0,
          medications: keywords.medications?.length || 0,
          triggers: keywords.triggers?.length || 0
        });
      } else {
        console.error('❌ [Phase 1.4] Failed to save health keywords');
      }
      
      // Phase 2.1: Detect patterns (background, won't block response)
      // Note: Pattern detection already done synchronously above for permission prompt
      // This is just for logging/verification
      try {
        if (keywords.symptoms && keywords.symptoms.length > 0 && 
            keywords.triggers && keywords.triggers.length > 0) {
          const pattern = await detectPatterns(userMessage, keywords, language);
          if (pattern) {
            console.log('✅ [Phase 2.1] Pattern detected in background:', {
              symptom: pattern.symptom,
              trigger: pattern.trigger,
              confidence: pattern.confidence
            });
          }
        }
      } catch (patternError) {
        console.warn('⚠️ [Phase 2.1] Error detecting patterns in background (non-critical):', patternError);
      }
    } else {
      console.log('ℹ️ [Phase 1.4] No health keywords extracted from message');
    }
  } catch (error) {
    console.error('❌ [Phase 1.4 & 2.1 & 3.1] Error in background extraction:', error);
    // Don't throw - this is background processing
  }
}

// Phase 2.2: Format permission prompt based on language
function formatPermissionPrompt(symptom: string, trigger: string, language: string): string {
  const prompts: { [key: string]: string } = {
    'English': `─────────────────────────────────
💡 I noticed this pattern: **${symptom}** after **${trigger}**. 
Would you like me to remember this connection so I can provide more personalized advice in the future?

[Yes, remember] [No thanks] [Maybe later]`,
    'Chinese': `─────────────────────────────────
💡 我注意到这个模式：**${symptom}** 在 **${trigger}** 之后。
您希望我记住这个关联，以便将来提供更个性化的建议吗？

[是的，记住] [不用了] [稍后再说]`,
    'Malay': `─────────────────────────────────
💡 Saya perasan corak ini: **${symptom}** selepas **${trigger}**.
Adakah anda mahu saya ingat perkaitan ini untuk memberikan nasihat yang lebih peribadi pada masa hadapan?

[Ya, ingat] [Tidak terima kasih] [Mungkin kemudian]`,
    'Indonesian': `─────────────────────────────────
💡 Saya melihat pola ini: **${symptom}** setelah **${trigger}**.
Apakah Anda ingin saya mengingat koneksi ini agar saya dapat memberikan saran yang lebih personal di masa depan?

[Ya, ingat] [Tidak terima kasih] [Mungkin nanti]`
  };

  // Default to English if language not found
  return prompts[language] || prompts['English'];
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
