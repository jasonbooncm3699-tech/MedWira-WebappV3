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

    // Step 1: Check if image contains medicine/packaging
    const medicineCheckResult = await model.generateContent([
      {
        text: `Analyze this image carefully. Is this a medicine-related image? Look for:
        - Medicine packaging (boxes, bottles, blister strips)
        - Pills, tablets, or capsules
        - Prescription labels
        - Pharmacy or medical context
        - Any text indicating medicine names, dosages, or medical use
        
        Respond with ONLY "YES" if it's medicine-related, or "NO" if it's not medicine-related.`
      },
      {
        inlineData: {
          data: imageBase64.split(',')[1], // Remove data:image/jpeg;base64, prefix
          mimeType: "image/jpeg"
        }
      }
    ]);

    const medicineCheckResponse = await medicineCheckResult.response;
    const medicineCheckText = medicineCheckResponse.text();
    const isMedicineRelated = medicineCheckText.trim().toUpperCase().includes('YES');

    if (!isMedicineRelated) {
      const errorMessage = language === 'Chinese' 
        ? '错误：图像中未检测到药品。请上传药品包装、药片或相关医疗用品的照片。'
        : `Error: No medicine detected in the image. Please upload a photo of medicine packaging, pills, or related medical items.`;
      
      return NextResponse.json({
        error: errorMessage,
        isMedicineRelated: false
      });
    }

    // Step 2: Check for packaging visibility
    const packagingCheckResult = await model.generateContent([
      {
        text: `Analyze this medicine image. Is there visible packaging (e.g., box, blister strip, bottle label, prescription label)? Look for:
        - Brand names or medicine names
        - Dosage information
        - Expiry dates
        - Manufacturer information
        - Any text or labels on packaging
        
        Respond with "YES" if packaging is clearly visible, or "NO" if only loose pills/tablets without packaging are shown.`
      },
      {
        inlineData: {
          data: imageBase64.split(',')[1],
          mimeType: "image/jpeg"
        }
      }
    ]);

    const packagingCheckResponse = await packagingCheckResult.response;
    const packagingCheckText = packagingCheckResponse.text();
    const hasPackaging = packagingCheckText.trim().toUpperCase().includes('YES');

    if (!hasPackaging) {
      const warningMessage = language === 'Chinese'
        ? '警告：未检测到药品包装。我们无法安全识别散装药片，因为存在假冒、过期或错误的风险。建议丢弃或咨询药剂师/医生。为了获得准确信息，请上传带有原始包装的照片。'
        : `Warning: No packaging detected. We cannot safely identify loose pills due to risks of counterfeits, expiry, or errors. Recommend discarding them or consulting a pharmacist/doctor. For accurate info, upload a photo with original packaging.`;
      
      return NextResponse.json({
        warning: warningMessage,
        hasPackaging: false,
        isMedicineRelated: true
      });
    }

    // Step 3: Extract medicine information from image
    const medicineInfoResult = await model.generateContent([
      {
        text: `Analyze this medicine packaging image and extract all visible information:
        - Medicine/brand name
        - Active ingredients
        - Dosage strength (e.g., 500mg)
        - Manufacturer
        - Any text visible on packaging
        - Expiry date if visible
        - Dosage instructions if visible
        
        Provide a detailed description of what you can see on the packaging.`
      },
      {
        inlineData: {
          data: imageBase64.split(',')[1],
          mimeType: "image/jpeg"
        }
      }
    ]);

    const medicineInfoResponse = await medicineInfoResult.response;
    const packagingInfo = medicineInfoResponse.text();

    // Step 4: Comprehensive analysis using Gemini's superior search capabilities
    const languageInstructions = getLanguageInstructions(language);
    
    const comprehensiveAnalysisResult = await model.generateContent([
      {
        text: `You are Seamed AI powered by Google's advanced search capabilities. You have access to comprehensive pharmaceutical databases, medical literature, and real-time web search through Google's search infrastructure.

        Based on the medicine packaging information: "${packagingInfo}", provide a comprehensive medical analysis including:

        **Medicine Name:** Full name with active ingredients and strength

        **Purpose:** What conditions this medicine treats

        **Dosage Instructions:**
        • Adults/Children over 12: [specific dosing]
        • Children 7-12 years: [specific dosing]
        • Follow packaging instructions

        **Side Effects:** Common and rare side effects

        **Allergy Warnings:** Active ingredients and excipients that may cause reactions

        **Drug Interactions:**
        • With other medicines
        • With food
        • With alcohol

        **Safety Notes:**
        • For children
        • For pregnant women
        • For special populations

        **Cross-Border Equivalents:** Equivalent names in Southeast Asian countries (Malaysia, Singapore, Thailand, Vietnam, Philippines, etc.)

        **Storage Instructions:** Temperature, conditions, expiry

        **Disclaimer:** Medical advice disclaimer

        ${languageInstructions}

        IMPORTANT: Use Google's comprehensive search capabilities to find the most current and accurate information. Search multiple pharmaceutical databases, medical websites, and official drug information sources. Provide authoritative medical analysis with specific, detailed information based on the most up-to-date data available.`
      }
    ]);

    const comprehensiveAnalysisResponse = await comprehensiveAnalysisResult.response;
    let analysis = comprehensiveAnalysisResponse.text();

    // Step 5: Check for allergy conflicts
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
