import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let language = 'English'; // Default fallback
  try {
    const { imageBase64, language: requestLanguage, allergy } = await request.json();
    language = requestLanguage;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate image format
    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Please upload a valid image file.' },
        { status: 400 }
      );
    }

    // MOCK RESPONSE - Gemini integration removed
    console.log('Mock image analysis - Gemini integration disabled');
    console.log('Image data length:', imageBase64.length);
    console.log('Language:', language);
    console.log('Allergy:', allergy);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock successful analysis
    const mockAnalysis = `**Packaging Detected:** Yes—Standard pharmaceutical packaging with clear labeling

**Medicine Name:** Sample Medicine (Paracetamol 500mg)

**Purpose:** Pain relief and fever reduction

**Dosage Instructions:**
• **Adults/Children over 12:** 1-2 tablets every 4-6 hours as needed
• **Children 7-12 years:** 1/2 to 1 tablet every 4-6 hours as needed
• **General:** Do not exceed 8 tablets in 24 hours

**Side Effects:** Common: Nausea, stomach upset. Rare: Allergic reactions, liver damage. Overdose risk: Liver failure—seek immediate help if exceeded.

**Allergy Warning:** Contains paracetamol and excipients. May cause reactions if allergic to paracetamol.

**Drug Interactions:**
• **With other drugs:** May interact with blood thinners and other medications
• **With food:** Can be taken with or without food
• **With alcohol:** Avoid excessive alcohol consumption

**Safety Notes:**
• **For kids:** Use appropriate pediatric dosing
• **For pregnant women:** Generally safe, consult doctor
• **Other:** Do not use if you have liver disease

**Cross-Border Info:** Widely available in SEA pharmacies under various brand names.

**Storage:** Store at room temperature, keep away from moisture and direct sunlight.

**Disclaimer:** This is a mock response for testing purposes. Not medical advice. Consult a doctor or pharmacist before use.`;

    return NextResponse.json({
      success: true,
      analysis: mockAnalysis,
      allergyWarning: allergy ? `Note: User has allergies to ${allergy}. Please consult a healthcare provider.` : '',
      hasPackaging: true,
      isMedicineRelated: true
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

