import { NextRequest } from 'next/server';
import { geminiAnalyzer } from '@/lib/gemini-service';
import { checkTokenAvailability, decrementToken, saveScanHistory } from '@/lib/npraDatabase';

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

            // CRITICAL: Save scan history and deduct tokens asynchronously to avoid blocking AI response
            if (userId && result.success) {
              // Use setImmediate to defer non-critical operations
              setImmediate(async () => {
                // Save scan history to database
                try {
                  console.log(`🔍 Attempting to save scan history for user ${userId}`);
                  await saveScanHistory({
                    user_id: userId,
                    image_url: imageBase64,
                    medicine_name: result.medicineName,
                    generic_name: result.genericName,
                    dosage: result.dosage,
                    side_effects: result.sideEffects,
                    interactions: result.interactions,
                    warnings: result.warnings,
                    storage: result.storage,
                    category: result.category,
                    confidence: result.confidence,
                    language: language || 'English',
                    allergies: userAllergies || null,
                  });
                  console.log(`✅ Scan history saved successfully for user ${userId} (async)`);
                } catch (error) {
                  console.error('Error saving scan history (async):', error);
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
