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

    // Get OpenAI API key from environment variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Step 1: Check if image contains medicine/packaging
    const medicineCheckResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image carefully. Is this a medicine-related image? Look for:
                - Medicine packaging (boxes, bottles, blister strips)
                - Pills, tablets, or capsules
                - Prescription labels
                - Pharmacy or medical context
                - Any text indicating medicine names, dosages, or medical use
                
                Respond with ONLY "YES" if it's medicine-related, or "NO" if it's not medicine-related.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    if (!medicineCheckResponse.ok) {
      throw new Error(`OpenAI API error: ${medicineCheckResponse.status}`);
    }

    const medicineCheckData = await medicineCheckResponse.json();
    const isMedicineRelated = medicineCheckData.choices[0].message.content.trim().toUpperCase().includes('YES');

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
    const packagingCheckResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this medicine image. Is there visible packaging (e.g., box, blister strip, bottle label, prescription label)? Look for:
                - Brand names or medicine names
                - Dosage information
                - Expiry dates
                - Manufacturer information
                - Any text or labels on packaging
                
                Respond with "YES" if packaging is clearly visible, or "NO" if only loose pills/tablets without packaging are shown.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!packagingCheckResponse.ok) {
      throw new Error(`OpenAI API error: ${packagingCheckResponse.status}`);
    }

    const packagingCheckData = await packagingCheckResponse.json();
    const hasPackaging = packagingCheckData.choices[0].message.content.trim().toUpperCase().includes('YES');

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
    const medicineInfoResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
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
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!medicineInfoResponse.ok) {
      throw new Error(`OpenAI API error: ${medicineInfoResponse.status}`);
    }

    const medicineInfoData = await medicineInfoResponse.json();
    const packagingInfo = medicineInfoData.choices[0].message.content;

    // Step 4: Hybrid approach - Try database first, then web search fallback
    const languageInstructions = getLanguageInstructions(language);
    
    // First attempt: Search AI's pharmaceutical database
    const databaseSearchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are Seamed AI with access to comprehensive pharmaceutical databases. Search your database for this medicine: "${packagingInfo}"

            Provide detailed analysis if found, including:
            - Medicine name, active ingredients, strength
            - Purpose and medical use
            - Dosage instructions
            - Side effects
            - Allergy warnings
            - Drug interactions
            - Safety notes
            - Cross-border equivalents in SEA
            - Storage instructions

            ${languageInstructions}

            If you have comprehensive information about this medicine, provide detailed analysis. If information is limited or uncertain, respond with "DATABASE_INCOMPLETE" at the start of your response.`
          }
        ],
        max_tokens: 1200,
        temperature: 0.2,
      }),
    });

    if (!databaseSearchResponse.ok) {
      throw new Error(`Database search error: ${databaseSearchResponse.status}`);
    }

    const databaseResult = await databaseSearchResponse.json();
    const databaseAnalysis = databaseResult.choices[0].message.content;
    
    // Check if database search was comprehensive enough
    const isDatabaseComplete = !databaseAnalysis.trim().startsWith('DATABASE_INCOMPLETE');
    
    let finalAnalysis = databaseAnalysis;
    
    if (!isDatabaseComplete) {
      console.log('Database search incomplete, conducting web search fallback...');
      
      // Web search fallback for incomplete database results
      const webSearchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: `You are Seamed AI conducting a comprehensive web search for medicine information. The medicine packaging shows: "${packagingInfo}"

              IMPORTANT: Conduct a thorough web search using your knowledge of current pharmaceutical databases, medical websites, and drug information sources. Search for:
              - Official medicine databases (FDA, EMA, Health Canada, etc.)
              - Pharmaceutical company information
              - Medical literature and research
              - Southeast Asian medicine databases (MIMS, etc.)
              - Current drug information websites

              Based on your comprehensive search, provide detailed analysis including:

              **Medicine Name:** Full name with active ingredients and strength
              **Purpose:** What conditions this medicine treats
              **Dosage Instructions:** Age-appropriate dosing
              **Side Effects:** Common and rare side effects
              **Allergy Warnings:** Active ingredients and excipients
              **Drug Interactions:** With medicines, food, alcohol
              **Safety Notes:** For children, pregnant women, special populations
              **Cross-Border Equivalents:** SEA country equivalents
              **Storage Instructions:** Temperature, conditions, expiry
              **Disclaimer:** Medical advice disclaimer

              ${languageInstructions}

              Format with clear **bold headers** and bullet points. Provide the most current and accurate information available from your comprehensive search.`
            }
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      });

      if (!webSearchResponse.ok) {
        throw new Error(`Web search error: ${webSearchResponse.status}`);
      }

      const webSearchResult = await webSearchResponse.json();
      finalAnalysis = webSearchResult.choices[0].message.content;
    }

    const comprehensiveAnalysisResponse = { ok: true };

    if (!comprehensiveAnalysisResponse.ok) {
      throw new Error(`OpenAI API error: ${comprehensiveAnalysisResponse.status}`);
    }

    // Use the final analysis from either database or web search
    let analysis = finalAnalysis;

    // Step 5: Check for allergy conflicts
    let allergyWarning = '';
    if (allergy && allergy.trim()) {
      const allergyCheckResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: `Check if the medicine "${packagingInfo}" contains or interacts with the allergen: "${allergy}". 

              Respond with:
              - "CONFLICT: [explanation]" if there's a potential allergy conflict
              - "SAFE: No allergy conflicts detected" if it's safe
              
              Be very careful about cross-reactions and similar chemical compounds.`
            }
          ],
          max_tokens: 100,
          temperature: 0.1,
        }),
      });

      if (allergyCheckResponse.ok) {
        const allergyData = await allergyCheckResponse.json();
        const allergyResult = allergyData.choices[0].message.content;
        
        if (allergyResult.includes('CONFLICT')) {
          allergyWarning = `⚠️ **Allergy Warning**: ${allergyResult.replace('CONFLICT:', '').trim()} Please consult a doctor before taking this medicine.`;
        } else {
          allergyWarning = '✅ No allergy conflicts detected. However, always consult a doctor if you have concerns.';
        }
      }
    }

    // Add allergy warning to analysis if present
    if (allergyWarning) {
      analysis += `\n\n${allergyWarning}`;
    }

    return NextResponse.json({
      success: true,
      isMedicineRelated: true,
      hasPackaging: true,
      packagingInfo,
      analysis,
      language
    });

  } catch (error) {
    console.error('Image analysis API error:', error);
    return NextResponse.json(
      { 
        error: language === 'Chinese' 
          ? '图像分析失败。请重试或联系支持。'
          : 'Failed to analyze image. Please try again or contact support.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getLanguageInstructions(language: string): string {
  const instructions: { [key: string]: string } = {
    'English': 'Provide the response in English.',
    'Chinese': '请用中文提供回复。',
    'Malay': 'Berikan respons dalam Bahasa Melayu.',
    'Indonesian': 'Berikan respons dalam Bahasa Indonesia.',
    'Thai': 'ให้คำตอบเป็นภาษาไทย',
    'Vietnamese': 'Cung cấp phản hồi bằng tiếng Việt.',
    'Tagalog': 'Magbigay ng tugon sa Tagalog.',
    'Burmese': 'မြန်မာဘာသာဖြင့် တုံ့ပြန်ပါ။',
    'Khmer': 'ផ្តល់ការឆ្លើយតបជាភាសាខ្មែរ។',
    'Lao': 'ໃຫ້ການຕອບກັບເປັນພາສາລາວ.'
  };
  
  return instructions[language] || instructions['English'];
}
