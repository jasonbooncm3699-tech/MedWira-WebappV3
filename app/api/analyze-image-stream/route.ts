import { NextRequest } from 'next/server';
import { geminiAnalyzer } from '@/lib/gemini-service';
import { checkTokenAvailability, decrementToken } from '@/lib/npraDatabase';
import { createClient } from '@supabase/supabase-js';

// Configure timeout for this API route
export const maxDuration = 30; // 30 seconds max
export const dynamic = 'force-dynamic';

// Create Supabase client directly in API route to avoid import issues
function getSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Local saveChatMessage function to avoid import issues
async function saveChatMessage(chatData: {
  user_id: string;
  message_type: 'user' | 'ai';
  message_text?: string;
  ai_response?: string;
  session_id: string;
  message_sequence: number;
  image_url?: string;
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
  conversation_context?: string;
  conversation_title?: string;
  conversation_preview?: string;
  conversation_tags?: string[];
}): Promise<any> {
  console.log(`🔍 [DEBUG] ===== saveChatMessage FUNCTION CALLED =====`);
  console.log(`🔍 [DEBUG] Input data:`, {
    user_id: chatData.user_id,
    user_id_type: typeof chatData.user_id,
    message_type: chatData.message_type,
    session_id: chatData.session_id,
    message_sequence: chatData.message_sequence,
    has_message_text: !!chatData.message_text,
    has_ai_response: !!chatData.ai_response,
    timestamp: new Date().toISOString()
  });
  
  const supabase = getSupabaseClient();
  console.log(`🔍 [DEBUG] Supabase client created successfully`);
  
  // Prepare data with proper defaults for NOT NULL constraints
  const insertData = {
    ...chatData,
    image_url: chatData.image_url || '', // CRITICAL: Use empty string instead of null for NOT NULL constraint
    language: chatData.language || 'English', // Default language
    message_sequence: chatData.message_sequence || 1, // Default sequence
    created_at: new Date().toISOString() // Explicit timestamp
  };
  
  console.log(`🔍 [DEBUG] About to execute database insert with data:`, {
    table: 'chat_history',
    insertDataKeys: Object.keys(insertData),
    insertDataPreview: {
      user_id: insertData.user_id,
      message_type: insertData.message_type,
      session_id: insertData.session_id,
      message_sequence: insertData.message_sequence
    }
  });
  
  const { data, error } = await supabase
    .from('chat_history')
    .insert([insertData])
    .select()
    .single();
  
  console.log(`🔍 [DEBUG] Database insert result:`, {
    hasData: !!data,
    hasError: !!error,
    errorDetails: error ? {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    } : null,
    dataPreview: data ? {
      id: data.id,
      user_id: data.user_id,
      message_type: data.message_type
    } : null
  });
  
  if (error) {
    console.error('❌ CRITICAL: Chat history save error:', error);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    throw error;
  }
  
  console.log(`✅ SUCCESS: Chat message saved for user ${chatData.user_id}`);
  console.log(`🔍 [DEBUG] ===== saveChatMessage FUNCTION COMPLETED =====`);
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, userId, language, textQuery, userAllergies } = body;

    // Debug: Log received parameters
    console.log(`🔍 [API] Received parameters:`, {
      userId: userId ? 'present' : 'missing',
      language: language || 'NOT PROVIDED',
      textQuery: textQuery ? 'present' : 'missing',
      userAllergies: userAllergies ? 'present' : 'missing',
      imageSize: imageBase64 ? `${imageBase64.length} chars` : 'missing'
    });

    // Validate required fields
    if (!imageBase64 || !userId) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'Missing required fields: imageBase64, userId' })}\n\n`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    }

    // Validate image data format
    let cleanImageBase64 = imageBase64;
    if (imageBase64.startsWith('data:image/')) {
      cleanImageBase64 = imageBase64.split(',')[1];
    }

    // Check if base64 is valid
    try {
      const buffer = Buffer.from(cleanImageBase64, 'base64');
      if (buffer.length === 0) {
        throw new Error('Invalid base64 data: empty buffer');
      }
      console.log(`✅ Image validation passed: ${buffer.length} bytes`);
    } catch (error) {
      console.error('❌ Invalid base64 image data:', error);
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'Invalid image data format' })}\n\n`,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    }

    // Check user token balance if user is logged in
    if (userId) {
      try {
        const hasTokens = await checkTokenAvailability(userId);
        if (!hasTokens) {
          return new Response(
            `data: ${JSON.stringify({ type: 'error', error: 'No tokens remaining. Please upgrade your plan or wait for daily reset.' })}\n\n`,
            { 
              status: 200, 
              headers: { 
                'Content-Type': 'text/plain',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
              } 
            }
          );
        }
      } catch (error) {
        console.error('Error checking user tokens:', error);
        return new Response(
          `data: ${JSON.stringify({ type: 'error', error: 'Token validation failed. Please try again.' })}\n\n`,
          { 
            status: 200, 
            headers: { 
              'Content-Type': 'text/plain',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            } 
          }
        );
      }
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Localized status messages
        const getLocalizedStatusMessage = (message: string, lang: string) => {
          const statusTranslations: { [key: string]: { [key: string]: string } } = {
            'Starting analysis...': {
              'English': 'Starting analysis...',
              'Chinese': '正在开始分析...',
              'Malay': 'Memulakan analisis...',
              'Indonesian': 'Memulai analisis...'
            },
            'Extracting text from image...': {
              'English': 'Extracting text from image...',
              'Chinese': '正在从图像中提取文本...',
              'Malay': 'Mengekstrak teks dari imej...',
              'Indonesian': 'Mengekstrak teks dari gambar...'
            }
          };
          return statusTranslations[message]?.[lang] || message;
        };

        // Send status updates as AI processing progresses
        const sendStatus = (status: string) => {
          try {
            const localizedStatus = getLocalizedStatusMessage(status, language || 'English');
            console.log(`📊 [SSE] Sending status to frontend: ${localizedStatus}`);
            const data = `data: ${JSON.stringify({ type: 'status', status: localizedStatus })}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Error sending status:', error);
          }
        };

        // Send error message
        const sendError = (error: string) => {
          try {
            const data = `data: ${JSON.stringify({ type: 'error', error })}\n\n`;
            controller.enqueue(encoder.encode(data));
            controller.close();
          } catch (err) {
            console.error('Error sending error:', err);
            controller.close();
          }
        };

        // Start AI processing with real status updates
        const processAnalysis = async () => {
          try {
            // Send initial status - this should match frontend
            sendStatus('Starting analysis...');

            // Add timeout wrapper for the analysis
            const analysisPromise = geminiAnalyzer.analyzeMedicineImageWithStatus(
              cleanImageBase64,
              language || 'English',
              userAllergies || '',
              sendStatus // Pass the status callback
            );

            // Set timeout based on language complexity - shorter to prevent Vercel timeout
            const timeoutMs = language === 'English' ? 25000 : 28000; // Shorter timeout to prevent Vercel timeout
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Analysis timeout')), timeoutMs)
            );

            const result = await Promise.race([analysisPromise, timeoutPromise]) as any;

            // CRITICAL: Deduct token FIRST, then save chat history SYNCHRONOUSLY
            console.log(`🔍 [DEBUG] Checking save conditions - userId: ${userId}, result.success: ${result.success}`);
            if (userId && result.success) {
              console.log(`🔍 [DEBUG] Conditions met, proceeding with token deduction and database save`);
              
              // Deduct token FIRST to ensure it happens
              try {
                console.log(`🔍 [DEBUG] Attempting to deduct token for user ${userId}`);
                const success = await decrementToken(userId);
                if (success) {
                  console.log(`✅ Token deducted successfully for user ${userId} - proceeding with chat history save`);
                } else {
                  console.log(`⚠️ User ${userId} has no tokens or deduction failed - skipping chat history save`);
                  return; // Exit early if no tokens
                }
              } catch (error) {
                console.error('❌ CRITICAL ERROR deducting token:', error);
                console.error('❌ Full error details:', JSON.stringify(error, null, 2));
                console.log(`⚠️ Token deduction failed for user ${userId} - continuing with chat history save`);
                // Continue with chat history save even if token deduction fails
              }
              
              // Save chat history to database SYNCHRONOUSLY
              try {
                // Generate session ID for this conversation
                const sessionId = crypto.randomUUID();
                
                console.log(`🔍 Attempting to save chat history for user ${userId}, session ${sessionId}`);
                
                // Generate conversation metadata for image analysis (generate once for the conversation)
                const conversationTitle = generateConversationTitle(`Medicine image analysis: ${result.medicineName || 'Unknown medicine'}`, result.rawAnalysis || '');
                const conversationPreview = generateConversationPreview(result.rawAnalysis || '');
                const conversationTags = generateConversationTags(`Medicine image analysis`, result);
                
                console.log(`🔍 Generated conversation metadata:`, {
                  title: conversationTitle,
                  preview: conversationPreview?.substring(0, 50) + '...',
                  tags: conversationTags
                });
                
                // Save user message (image upload) with conversation metadata
                await saveChatMessage({
                  user_id: userId,
                  message_type: 'user',
                  message_text: 'Uploaded medicine image for analysis',
                  session_id: sessionId,
                  message_sequence: 1,
                  image_url: imageBase64,
                  language: language || 'English',
                  allergies: userAllergies || null,
                  conversation_context: `Medicine analysis: ${result.medicineName}`,
                  conversation_title: conversationTitle,
                  conversation_preview: conversationPreview,
                  conversation_tags: conversationTags
                });
                
                console.log(`✅ User message saved successfully for user ${userId}, session ${sessionId}`);
                
                // Save AI response with metadata
                await saveChatMessage({
                  user_id: userId,
                  message_type: 'ai',
                  ai_response: result.rawAnalysis,
                  session_id: sessionId,
                  message_sequence: 2,
                  conversation_title: conversationTitle,
                  conversation_preview: conversationPreview,
                  conversation_tags: conversationTags,
                  medicine_name: result.medicineName,
                  generic_name: result.genericName,
                  dosage: result.dosage,
                  side_effects: Array.isArray(result.sideEffects) ? result.sideEffects : (result.sideEffects ? [result.sideEffects] : undefined),
                  interactions: Array.isArray(result.interactions) ? result.interactions : (result.interactions ? [result.interactions] : undefined),
                  warnings: Array.isArray(result.warnings) ? result.warnings : (result.warnings ? [result.warnings] : undefined),
                  storage: result.storage,
                  category: result.category,
                  confidence: result.confidence,
                  language: language || 'English',
                  allergies: userAllergies || null,
                  conversation_context: `Medicine analysis: ${result.medicineName}`
                });
                
                console.log(`✅ AI response saved successfully for user ${userId}, session ${sessionId}`);
                console.log(`✅ Chat history saved successfully for user ${userId}, session ${sessionId}`);
              } catch (error) {
                console.error('❌ CRITICAL ERROR saving chat history:', error);
                console.error('❌ Full error details:', JSON.stringify(error, null, 2));
                // Don't throw - we still want to return the AI response even if save fails
              }
            }

            // Send final result
            console.log(`📊 [SSE] Sending final result to frontend:`, {
              success: result.success,
              medicineName: result.medicineName,
              hasData: !!result.rawAnalysis
            });
            const finalData = `data: ${JSON.stringify({ 
              type: 'complete', 
              result 
            })}\n\n`;
            controller.enqueue(encoder.encode(finalData));
            
            // Add a small delay before closing to ensure frontend receives the data
            setTimeout(() => {
              controller.close();
              console.log(`📊 [SSE] Stream closed successfully`);
            }, 100);

          } catch (error) {
            console.error('Analysis error:', error);
            
            // Handle timeout specifically
            if (error instanceof Error && error.message === 'Analysis timeout') {
              console.warn('⚠️ Analysis timed out, sending timeout message');
              sendError('Analysis timed out. Please try again with a clearer image.');
            } else {
              sendError(error instanceof Error ? error.message : 'Analysis failed');
            }
          }
        };

        // Start processing
        processAnalysis();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('SSE endpoint error:', error);
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`,
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        } 
      }
    );
  }
}

// Helper functions for conversation metadata generation
function generateConversationTitle(userMessage: string, aiResponse: string): string {
  // Extract medicine name from AI response for personalized titles
  // Try multiple patterns to match different AI response formats
  
  // Pattern 1: **Medicine**: FEDAC TABLET (format from logs)
  const medicineNameMatch1 = aiResponse.match(/\*\*Medicine\*\*:\s*([A-Za-z0-9\s\-\(\)]+)/i);
  if (medicineNameMatch1) {
    const medicineName = medicineNameMatch1[1].trim();
    const cleanName = medicineName.split('(')[0].trim();
    return `${cleanName} Analysis`;
  }
  
  // Pattern 2: Medicine: FEDAC TABLET (without bold formatting)
  const medicineNameMatch2 = aiResponse.match(/Medicine:\s*([A-Za-z0-9\s\-\(\)]+)/i);
  if (medicineNameMatch2) {
    const medicineName = medicineNameMatch2[1].trim();
    const cleanName = medicineName.split('(')[0].trim();
    return `${cleanName} Analysis`;
  }
  
  // Pattern 3: Look for medicine name in the first few lines
  const lines = aiResponse.split('\n').slice(0, 5);
  for (const line of lines) {
    const medicineMatch = line.match(/([A-Z][A-Za-z0-9\s\-]+(?:TABLET|CAPSULE|PILL|POWDER|SYRUP|DROPS|INJECTION))/i);
    if (medicineMatch) {
      const medicineName = medicineMatch[1].trim();
      return `${medicineName} Analysis`;
    }
  }
  
  // Fallback: Extract from user message if available
  const userMedicineMatch = userMessage.match(/medicine.*analysis[:\s]*([A-Za-z0-9\s]+)/i);
  if (userMedicineMatch) {
    return `${userMedicineMatch[1].trim()} Analysis`;
  }
  
  // Final fallback: Use generic title
  return 'Medicine Image Analysis';
}

function generateConversationPreview(aiResponse: string): string {
  if (!aiResponse) return '';
  
  const sentences = aiResponse.split('\n').filter((line: string) => line.trim().length > 0);
  
  for (const line of sentences) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('**') || 
        trimmedLine.startsWith('#') || 
        trimmedLine.startsWith('•') ||
        trimmedLine.startsWith('-') ||
        trimmedLine.length < 10) {
      continue;
    }
    
    const firstSentence = trimmedLine.split('.')[0] + '.';
    if (firstSentence.length > 10) {
      return firstSentence.length > 100 
        ? firstSentence.substring(0, 100) + '...'
        : firstSentence;
    }
  }
  
  const fallback = aiResponse.substring(0, 100);
  return fallback.length < aiResponse.length ? fallback + '...' : fallback;
}

function generateConversationTags(userMessage: string, result: any): string[] {
  const tags = new Set<string>();
  
  tags.add('IMAGE_ANALYSIS');
  if (result.medicineName) tags.add('MEDICINE');
  if (result.sideEffects && result.sideEffects.length > 0) tags.add('SIDE_EFFECTS');
  if (result.interactions && result.interactions.length > 0) tags.add('INTERACTIONS');
  if (result.warnings && result.warnings.length > 0) tags.add('WARNINGS');
  
  return Array.from(tags);
}
