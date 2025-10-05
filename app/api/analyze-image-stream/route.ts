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
        JSON.stringify({ error: 'Missing required fields: imageBase64, userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check user token balance if user is logged in
    if (userId) {
      try {
        const hasTokens = await checkTokenAvailability(userId);
        if (!hasTokens) {
          return new Response(
            JSON.stringify({ error: 'No tokens remaining. Please upgrade your plan or wait for daily reset.' }),
            { status: 402, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Error checking user tokens:', error);
        return new Response(
          JSON.stringify({ error: 'Token validation failed. Please try again.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
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
            // Send initial status
            sendStatus('Starting analysis...');

            // Use the new method with status callback
            const result = await geminiAnalyzer.analyzeMedicineImageWithStatus(
              imageBase64,
              language || 'English',
              userAllergies || '',
              sendStatus // Pass the status callback
            );

            // Save scan history and deduct token after successful analysis
            if (userId && result.success) {
              // Save scan history
              try {
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
                console.log(`✅ Scan history saved for user ${userId}`);
              } catch (error) {
                console.error('Error saving scan history:', error);
                // Don't fail the request if saving history fails
              }

              // Deduct token
              try {
                const success = await decrementToken(userId);
                if (success) {
                  console.log(`✅ Token deducted for user ${userId}`);
                } else {
                  console.log(`⚠️ User ${userId} has no tokens - skipping token deduction`);
                }
              } catch (error) {
                console.error('Error deducting token:', error);
                // Don't fail the request if token deduction fails
              }
            }

            // Send final result
            const finalData = `data: ${JSON.stringify({ 
              type: 'complete', 
              result 
            })}\n\n`;
            controller.enqueue(encoder.encode(finalData));
            controller.close();

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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
