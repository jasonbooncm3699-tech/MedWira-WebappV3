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
    
    const prompt = `Analyze this medicine image and provide comprehensive medical analysis. 

First, check if this is a medicine-related image. If not, respond with "Error: No medicine detected in the image."

If it is medicine-related, check for packaging. If no packaging is visible, respond with "Warning: No packaging detected. We cannot safely identify loose pills due to risks of counterfeits, expiry, or errors."

If packaging is visible, provide detailed analysis in this exact format:

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

Conduct comprehensive web search using Google's search infrastructure to find the most current and accurate information about this medicine. Search pharmaceutical databases, medical websites, and official drug information sources. Provide authoritative medical analysis with specific, detailed information based on the most up-to-date data available.`;

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

    const analysisResult = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType
        }
      }
    ]);

    const analysisResponse = await analysisResult.response;
    let analysis = analysisResponse.text();

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

    // Successful analysis
    return NextResponse.json({
      analysis: analysis,
      allergyWarning: allergyWarning,
      hasPackaging: true,
      isMedicineRelated: true
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
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
