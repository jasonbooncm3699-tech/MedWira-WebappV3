import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // Single comprehensive analysis - like the original OpenAI approach
    const languageInstructions = getLanguageInstructions(language);
    
    const prompt = `You are Seamed AI, a specialized medical analysis system. Analyze this medicine image carefully and extract all visible information from the packaging, then conduct comprehensive web searches to provide detailed medical analysis.

STEP 1: Examine the image carefully. Look for:
- Medicine packaging (boxes, bottles, blister strips, labels)
- Brand names, medicine names, active ingredients
- Dosage information, expiry dates, manufacturer details
- Any text visible on the packaging

STEP 2: If this is NOT a medicine-related image, respond with "Error: No medicine detected in the image."

STEP 3: If it IS medicine-related but NO packaging is visible, respond with "Warning: No packaging detected. We cannot safely identify loose pills due to risks of counterfeits, expiry, or errors."

STEP 4: If packaging IS visible, extract all information from the image, then conduct comprehensive web searches using Google's search infrastructure to verify and find accurate information:

WEB SEARCH STRATEGY:
1. Search for exact brand name + manufacturer: "[Brand Name] medicine [Manufacturer] [Country]"
2. Search for regional medicine databases: "[Brand Name] SEA medicine database Malaysia Singapore Thailand"
3. Search for active ingredients: "[Brand Name] active ingredients composition"
4. Search for official sources: "[Brand Name] official website manufacturer information"
5. Cross-reference multiple sources to ensure accuracy

VERIFICATION REQUIREMENTS:
- Verify medicine name and manufacturer from multiple sources
- Confirm active ingredients from official or reliable medical sources
- Check for regional availability and brand names in SEA countries
- Validate dosage information from packaging or official sources

Provide comprehensive analysis in this exact format:

**Packaging Detected:** Yes—[describe what packaging is visible, e.g., blister strip/box with brand label]

**Medicine Name:** [Full name with active ingredients and strength]

**Purpose:** [What conditions this medicine treats with specific details]

**Dosage Instructions:**
• Adults/Children over 12: [specific dosing from packaging and web info]
• Children 7-12 years: [specific dosing from packaging]
• Do not exceed recommended dose; follow packaging instructions

**Side Effects:** Common: [list common effects]. Rare: [list rare effects]. Overdose risk: [specific risks]—seek immediate help if exceeded.

**Allergy Warning:** Contains [active ingredients] and excipients (e.g., [list excipients]). May cause reactions if allergic. [If user entered allergies, add specific warning about potential triggers]

**Drug Interactions:**
• With other drugs: [specific interactions with other medicines]
• With food: [food interactions or lack thereof]
• With alcohol: [alcohol interactions and warnings]

**Safety Notes:**
• For kids: [age-specific safety information]
• For pregnant women: [pregnancy category and recommendations]
• Other: [additional safety considerations]

**Cross-Border Info:** Equivalent to [brand name] in [countries]; [alternative names] in [other countries]. Widely available in SEA pharmacies.

**Storage:** [specific storage instructions with temperature and conditions]

**Disclaimer:** This information is sourced from public websites and packaging details. For informational purposes only. Not medical advice. Consult a doctor or pharmacist before use.

${languageInstructions}

CRITICAL: You MUST conduct real-time web searches using Google's search infrastructure to find the most current and accurate information about this medicine. Do not rely solely on your training data.

REQUIRED SEARCHES:
1. Search for: "[Brand Name] medicine [Manufacturer] [Country] official information"
2. Search for: "[Brand Name] SEA medicine database Malaysia Singapore Thailand Vietnam Philippines"
3. Search for: "[Brand Name] active ingredients composition manufacturer"
4. Search for: "[Brand Name] liver supplement herbal medicine" (if applicable)
5. Search for: "[Brand Name] traditional medicine Malaysia Indonesia"

Search multiple pharmaceutical databases, medical websites, official drug information sources, and regional medicine databases. Cross-reference information from multiple sources to ensure accuracy. Provide authoritative medical analysis with specific, detailed information based on the most up-to-date data available from your web searches.`;

    // Handle different image formats
    let imageData, mimeType;
    if (imageBase64.includes(',')) {
      const [header, data] = imageBase64.split(',');
      imageData = data;
      if (header.includes('png')) {
        mimeType = "image/png";
      } else if (header.includes('jpeg') || header.includes('jpg')) {
        mimeType = "image/jpeg";
      } else {
        mimeType = "image/jpeg"; // default
      }
    } else {
      imageData = imageBase64;
      mimeType = "image/jpeg";
    }

    console.log('Starting Gemini analysis...');
    console.log('Image data length:', imageData.length);
    console.log('MIME type:', mimeType);
    console.log('Language:', language);
    
    // Add timeout to prevent hanging
    const analysisPromise = model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType
        }
      }
    ]);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Analysis timeout after 30 seconds')), 30000)
    );

    const analysisResult = await Promise.race([analysisPromise, timeoutPromise]);
    const analysisResponse = await analysisResult.response;
    let analysis = analysisResponse.text();
    
    console.log('Gemini analysis completed');
    console.log('Analysis length:', analysis.length);
    console.log('Analysis preview:', analysis.substring(0, 200));

    // Check for allergy conflicts if allergy is provided
    let allergyWarning = '';
    if (allergy && allergy.trim()) {
      const allergyCheckResult = await model.generateContent([
        {
          text: `Based on the medicine analysis: "${analysis}" and user allergy: "${allergy}", check for potential allergy conflicts. 
          
          If there are potential conflicts, provide a clear warning. If safe, confirm no conflicts detected.`
        }
      ]);

      const allergyCheckResponse = await allergyCheckResult.response;
      allergyWarning = allergyCheckResponse.text();
    }

    // Check if it's an error response
    if (analysis.includes('Error: No medicine detected')) {
      return NextResponse.json({
        error: analysis,
        isMedicineRelated: false
      });
    }

    // Check if it's a warning response
    if (analysis.includes('Warning: No packaging detected')) {
      return NextResponse.json({
        warning: analysis,
        hasPackaging: false,
        isMedicineRelated: true
      });
    }

    // Successful analysis - always return analysis field
    return NextResponse.json({
      success: true,
      analysis: analysis,
      allergyWarning: allergyWarning,
      hasPackaging: true,
      isMedicineRelated: true
    });

  } catch (error) {
    console.error('API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
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

function getLanguageInstructions(language: string): string {
  const instructions: { [key: string]: string } = {
    'English': 'Respond in English with clear, professional medical language.',
    'Chinese': '请用中文回复，使用专业、清晰的医学语言。',
    'Malay': 'Balas dalam bahasa Melayu dengan bahasa perubatan yang profesional dan jelas.',
    'Indonesian': 'Balas dalam bahasa Indonesia dengan bahasa medis yang profesional dan jelas.',
    'Thai': 'ตอบเป็นภาษาไทยด้วยภาษาการแพทย์ที่เป็นมืออาชีพและชัดเจน',
    'Vietnamese': 'Trả lời bằng tiếng Việt với ngôn ngữ y tế chuyên nghiệp và rõ ràng.',
    'Tagalog': 'Sumagot sa Tagalog gamit ang propesyonal at malinaw na wikang medikal.',
    'Burmese': 'မြန်မာဘာသာဖြင့် ပညာရှင်ဆန်ပြီး ရှင်းလင်းသော ဆေးဘက်ဆိုင်ရာ ဘာသာစကားဖြင့် ဖြေကြားပါ။',
    'Khmer': 'ឆ្លើយតបជាភាសាខ្មែរដោយប្រើភាសាវេជ្ជសាស្ត្រមុខរបរនិងច្បាស់លាស់។',
    'Lao': 'ຕອບເປັນພາສາລາວໂດຍໃຊ້ພາສາທາງການແພດທີ່ມືອາຊີບແລະຊັດເຈນ.'
  };
  
  return instructions[language] || instructions['English'];
}
