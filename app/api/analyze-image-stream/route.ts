import { NextRequest } from 'next/server';
import { geminiAnalyzer } from '@/lib/gemini-service';
import { checkTokenAvailability, decrementToken, saveChatMessage } from '@/lib/npraDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, userId, language, textQuery, userAllergies } = body;

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
        
        // Send status updates as AI processing progresses
        const sendStatus = (status: string) => {
          try {
            console.log(`📊 [SSE] Sending status to frontend: ${status}`);
            const data = `data: ${JSON.stringify({ type: 'status', status })}\n\n`;
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

            // Use the new method with status callback
            const result = await geminiAnalyzer.analyzeMedicineImageWithStatus(
              imageBase64,
              language || 'English',
              userAllergies || '',
              sendStatus // Pass the status callback
            );

            // CRITICAL: Save chat history and deduct tokens asynchronously to avoid blocking AI response
            console.log(`🔍 [DEBUG] Checking save conditions - userId: ${userId}, result.success: ${result.success}`);
            if (userId && result.success) {
              console.log(`🔍 [DEBUG] Conditions met, proceeding with database save`);
              // Use setImmediate to defer non-critical operations
              setImmediate(async () => {
                // Save chat history to database
                try {
                  // Generate session ID for this conversation
                  const sessionId = crypto.randomUUID();
                  
                  console.log(`🔍 Attempting to save chat history for user ${userId}, session ${sessionId}`);
                  
                  // Save user message (image upload)
                  await saveChatMessage({
                    user_id: userId,
                    message_type: 'user',
                    message_text: 'Uploaded medicine image for analysis',
                    session_id: sessionId,
                    message_sequence: 1,
                    image_url: imageBase64,
                    language: language || 'English',
                    allergies: userAllergies || null,
                    conversation_context: `Medicine analysis: ${result.medicineName}`
                  });
                  
                  // Generate conversation metadata for image analysis
                  const conversationTitle = generateConversationTitle(`Medicine image analysis: ${result.medicineName || 'Unknown medicine'}`, result.rawAnalysis || '');
                  const conversationPreview = generateConversationPreview(result.rawAnalysis || '');
                  const conversationTags = generateConversationTags(`Medicine image analysis`, result);
                  
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
                  
                  console.log(`✅ Chat history saved successfully for user ${userId}, session ${sessionId} (async)`);
                } catch (error) {
                  console.error('Error saving chat history (async):', error);
                }

                // Deduct token
                try {
                  const success = await decrementToken(userId);
                  if (success) {
                    console.log(`✅ Token deducted for user ${userId} (async)`);
                  } else {
                    console.log(`⚠️ User ${userId} has no tokens - skipping token deduction (async)`);
                  }
                } catch (error) {
                  console.error('Error deducting token (async):', error);
                }
              });
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
            sendError(error instanceof Error ? error.message : 'Analysis failed');
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
  const friendlyTitles: { [key: string]: string } = {
    'medicine.*image|image.*medicine': 'Medicine Image Analysis',
    'medicine.*analysis|analysis.*medicine': 'Medicine Analysis',
    'medicine.*identification|identification.*medicine': 'Medicine Identification'
  };
  
  const lowerText = userMessage.toLowerCase();
  for (const [pattern, friendlyTitle] of Object.entries(friendlyTitles)) {
    if (new RegExp(pattern).test(lowerText)) {
      return friendlyTitle;
    }
  }
  
  // Extract medicine name for title
  const medicineMatch = userMessage.match(/medicine.*analysis[:\s]*([A-Za-z0-9\s]+)/i);
  if (medicineMatch) {
    return `Medicine Analysis: ${medicineMatch[1].trim()}`;
  }
  
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
