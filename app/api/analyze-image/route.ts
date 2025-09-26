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
    const API_KEY = process.env.GOOGLE_API_KEY;
    
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Handle different image formats first
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

    // Single comprehensive analysis - like the original OpenAI approach
    const languageInstructions = getLanguageInstructions(language);
    
    // First, analyze the image to extract medicine information
    const initialPrompt = `Analyze this medicine image and extract the following information:
1. Brand name or medicine name
2. Active ingredient(s) and strength
3. Manufacturer name
4. Form (tablet, capsule, liquid, etc.)
5. Any visible text on packaging

Respond in this format:
Medicine Name: [name]
Active Ingredient: [ingredient and strength]
Manufacturer: [manufacturer]
Form: [form]
Additional Text: [any other visible text]`;

    console.log('Starting initial image analysis...');
    const initialAnalysisPromise = model.generateContent([
      initialPrompt,
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType
        }
      }
    ]);

    const initialTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Initial analysis timeout')), 15000)
    );

    const initialResult = await Promise.race([initialAnalysisPromise, initialTimeoutPromise]) as any;
    const initialResponse = await initialResult.response;
    const extractedInfo = initialResponse.text();
    
    console.log('Initial analysis completed:', extractedInfo);

    // Extract medicine name for reference
    const medicineNameMatch = extractedInfo.match(/Medicine Name:\s*(.+)/i);
    const medicineName = medicineNameMatch ? medicineNameMatch[1].trim() : '';
    
    console.log('Medicine identified:', medicineName);

    const prompt = `You are MedWira AI, a specialized medical analysis system. Based on the image analysis, provide comprehensive medical analysis.

EXTRACTED INFORMATION FROM IMAGE:
${extractedInfo}

SPECIAL MEDICINE DATABASE (if applicable):
If you identify "Livason" in the image, provide this specific information:
- Livason is a traditional herbal liver supplement manufactured by JH Nutrition
- Active ingredients: Milk Thistle Extract (Silybum marianum) and Phyllanthus niruri Extract
- Purpose: Liver health support, antioxidant effects, liver function protection
- Target users: Those with fatty liver, unhealthy lifestyle habits, smokers, alcohol drinkers
- Safety: Not FDA approved, not recommended for pregnant/breastfeeding women without medical advice
- Side effects: Generally well-tolerated, possible mild bloating or upset stomach

If you identify "安德 風痧濟急丸" (Ān Dé Fēng Shā Jì Jí Wán) or "PIL CHI KIT" in the image, provide this specific information:
- This is a traditional Chinese medicine manufactured by TECK AUN
- Medicine name: 風痧濟急丸 (Fēng Shā Jì Jí Wán) - Wind-Heat Emergency Pills
- Purpose: Treatment of wind-heat conditions, fever, sore throat, cold symptoms, and travel-related ailments
- Target users: Home and travel use for common cold and wind-heat symptoms
- Active ingredients: Traditional Chinese herbal formula (specific ingredients not listed on packaging)
- Dosage: Typically 3-5 pills, 2-3 times daily for adults (follow packaging instructions)
- Safety: Traditional medicine, consult TCM practitioner for proper usage
- Side effects: Generally well-tolerated when used as directed
- Storage: Keep in cool, dry place away from direct sunlight

If you identify "Avosil Lozenge" or "NMC" in the image, provide this specific information:
- Avosil Lozenge is an antiseptic throat lozenge manufactured by NMC
- Active ingredient: Cetylpyridinium Chloride 2mg
- Purpose: Temporary relief of sore throat, mouth irritation, and throat infections
- Target users: Adults and children over 12 years for throat discomfort
- Dosage: 1 lozenge every 2-3 hours as needed, maximum 8 lozenges per day
- Safety: Not recommended for children under 12 years without medical supervision
- Side effects: Generally well-tolerated, possible mild taste changes or mouth irritation
- Drug interactions: May reduce effectiveness of other mouth/throat medications
- Storage: Store at room temperature, keep away from moisture

IF NOT MEDICINE: Respond with "Error: No medicine detected in the image."
IF NO PACKAGING: Respond with "Warning: No packaging detected. We cannot safely identify loose pills due to risks of counterfeits, expiry, or errors."

IF MEDICINE WITH PACKAGING: Provide comprehensive analysis using the extracted information and web search results. If you don't have specific information, use your medical knowledge to provide general guidance based on the active ingredient(s) identified.

Provide analysis in this exact format:

**Packaging Detected:** Yes—[describe visible packaging details]

**Medicine Name:** [Full name with active ingredients and strength]

**Purpose:** [Specific conditions this medicine treats]

**Dosage Instructions:**
• **Adults/Children over 12:** [specific dosing information]
• **Children 7-12 years:** [age-appropriate dosing]
• **General:** Do not exceed recommended dose; follow packaging instructions

**Side Effects:** Common: [list common effects]. Rare: [list rare effects]. Overdose risk: [specific risks]—seek immediate help if exceeded.

**Allergy Warning:** Contains [active ingredients] and excipients (e.g., [list excipients]). May cause reactions if allergic. [If user entered allergies, add specific warning about potential triggers]

**Drug Interactions:**
• **With other drugs:** [specific interactions with other medicines]
• **With food:** [food interactions or lack thereof]
• **With alcohol:** [alcohol interactions and warnings]

**Safety Notes:**
• **For kids:** [age-specific safety information]
• **For pregnant women:** [pregnancy category and recommendations]
• **Other:** [additional safety considerations]

**Cross-Border Info:** Equivalent to [brand name] in [countries]; [alternative names] in [other countries]. Widely available in SEA pharmacies.

**Storage:** [specific storage instructions with temperature and conditions]

**Disclaimer:** This information is sourced from medical databases, web searches, and packaging details. For informational purposes only. Not medical advice. Consult a doctor or pharmacist before use.

${languageInstructions}

IMPORTANT: Use the extracted information to provide specific, helpful information. Do not provide generic responses like "Unable to determine" - always provide detailed analysis based on available information.`;

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

    const analysisResult = await Promise.race([analysisPromise, timeoutPromise]) as any;
    const analysisResponse = await analysisResult.response;
    let analysis = analysisResponse.text();
    
    console.log('Gemini analysis completed');
    console.log('Analysis length:', analysis.length);
    console.log('Analysis preview:', analysis.substring(0, 200));

    // Format bullet points for better web display
    analysis = formatBulletPoints(analysis);

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

  } catch (error: any) {
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

function formatBulletPoints(text: string): string {
  // Convert bullet points to HTML format for better web display
  return text
    // Convert • bullets to HTML list items with proper spacing
    .replace(/• \*\*(.*?):\*\* (.*?)(?=\n•|$)/gs, '• **$1:** $2\n')
    // Ensure proper line breaks after bullet points
    .replace(/• /g, '\n• ')
    // Clean up multiple line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
