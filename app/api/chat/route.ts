import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { language, messages } = await request.json();

    // Get API key from environment variables
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const systemPrompt = `You are Seamed AI, a specialized medical assistant for Southeast Asian medicines. You have comprehensive access to pharmaceutical databases and medical literature.

    When users ask about medicines, provide detailed analysis including:
    - Medicine name and active ingredients
    - Purpose and dosage instructions
    - Side effects and allergy warnings
    - Drug interactions
    - Safety notes for different populations
    - Cross-border equivalents in SEA countries
    - Storage instructions
    - Medical disclaimer

    Always conduct web search to find the most current and accurate information. Respond in ${language} when possible, but prioritize accuracy over language preference.

    IMPORTANT: Always provide comprehensive analysis using your knowledge and web search capabilities. Never say you cannot provide analysis - always search multiple sources for current and accurate information.`;

    // Build the full conversation with system prompt
    const conversation = [
      systemPrompt,
      ...messages.map((msg: { type: string; content: string }) => msg.content)
    ].join('\n\n');

    const result = await model.generateContent(conversation);
    const response = await result.response;
    const aiResponse = response.text();

    return NextResponse.json({ 
      response: aiResponse
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
