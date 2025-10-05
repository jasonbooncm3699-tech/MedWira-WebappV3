import { NextRequest } from 'next/server';
import { geminiAnalyzer } from '@/lib/gemini-service';

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
