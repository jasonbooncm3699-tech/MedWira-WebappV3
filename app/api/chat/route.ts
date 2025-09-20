import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, language, messages } = await request.json();

    // Get OpenAI API key from environment variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are Seamed AI, a professional medicine identification assistant specializing in Southeast Asian medicines. When users upload medicine images, provide comprehensive analysis including:

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

Format responses with clear sections using **bold headers**. If no packaging is detected, warn about safety risks. If image is not medicine-related, ask for medicine photo. Respond in ${language} when possible, but prioritize accuracy over language preference.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((msg: any) => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
