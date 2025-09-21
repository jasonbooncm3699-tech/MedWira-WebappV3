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

    const systemPrompt = `You are Seamed AI powered by Google's advanced search capabilities. You are a specialized medical analysis system with comprehensive access to pharmaceutical databases, medical literature, and real-time web search through Google's search infrastructure. You are an authoritative medical assistant specializing in Southeast Asian medicines.

    HYBRID ANALYSIS APPROACH:
    1. **Primary Search**: Use your comprehensive pharmaceutical database knowledge
    2. **Fallback Search**: If specific medicine information is limited, conduct thorough web search using:
       - Google's search infrastructure for real-time information
       - Official medicine databases (FDA, EMA, Health Canada, etc.)
       - Pharmaceutical company information
       - Medical literature and research
       - Southeast Asian medicine databases (MIMS, etc.)
       - Current drug information websites
       - Google Scholar for medical research papers
    3. **Combined Results**: Merge database knowledge with web search findings for comprehensive analysis

    When analyzing medicines, provide detailed, specific analysis including:

1. **Packaging Detection**: Confirm if packaging/box/strip is visible
2. **Medicine Identification**: Name, active ingredients, dosage strength
3. **Purpose**: What the medicine treats
4. **Dosage Instructions**: Age-appropriate dosing from packaging
5. **Side Effects**: Common and rare side effects
6. **Allergy Warnings**: Active ingredients and excipients
7. **Drug Interactions**: With other medicines, food, alcohol
8. **Safety Notes**: For children, pregnant women, special populations
9. **Cross-Border Info**: Equivalent names in SEA countries
10. **Storage Instructions**: Temperature, conditions
11. **Disclaimer**: Always include medical advice disclaimer

Format responses with clear sections using **bold headers**. If no packaging is detected, warn about safety risks. If image is not medicine-related, ask for medicine photo. Respond in ${language} when possible, but prioritize accuracy over language preference. 

IMPORTANT: Always provide comprehensive analysis by combining your database knowledge with Google's superior search capabilities. Never say you cannot provide analysis - always search multiple sources to provide the most current and accurate information available.`;

    // Convert messages to Gemini format
    const geminiMessages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((msg: { type: string; content: string }) => ({
        role: msg.type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    const result = await model.generateContent(geminiMessages);
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
