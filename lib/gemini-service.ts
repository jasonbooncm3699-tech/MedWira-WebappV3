import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatabaseService } from './supabase';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface MedicineAnalysisResult {
  success: boolean;
  medicineName?: string;
  genericName?: string;
  dosage?: string;
  sideEffects?: string[];
  interactions?: string[];
  warnings?: string[];
  storage?: string;
  category?: string;
  confidence?: number;
  error?: string;
  language?: string;
  // Enhanced fields for 11-section format
  packagingDetected?: string;
  purpose?: string;
  dosageInstructions?: string;
  allergyWarning?: string;
  drugInteractions?: string;
  safetyNotes?: string;
  disclaimer?: string;
}

export interface NPRAMedicineData {
  ref_no: string;
  reg_no: string;
  product: string;
  generic_name: string;
  active_ingredient: string;
  manufacturer: string;
  holder: string;
  status: string;
}

export class GeminiMedicineAnalyzer {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async analyzeMedicineImage(
    imageBase64: string,
    language: string = 'English',
    userAllergies: string = ''
  ): Promise<MedicineAnalysisResult> {
    try {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // STEP 1: Initial image analysis to extract medicine name and basic info
      const initialPrompt = this.generateInitialAnalysisPrompt(language, userAllergies);
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };

      const initialResult = await this.model.generateContent([initialPrompt, imagePart]);
      const initialResponse = await initialResult.response;
      const initialText = initialResponse.text();

      // Parse initial analysis to get medicine name for NPRA lookup
      const initialAnalysis = this.parseInitialResponse(initialText);
      
      if (!initialAnalysis.success || !initialAnalysis.medicineName) {
        return {
          success: false,
          error: 'Could not identify medicine from image. Please try with a clearer photo.',
          language
        };
      }

      // STEP 2: Query NPRA database for confirmed active ingredients
      let npraData: NPRAMedicineData[] = [];
      try {
        npraData = await DatabaseService.searchNPRA(initialAnalysis.medicineName);
        console.log(`✅ NPRA Query Results: ${npraData.length} matches found`);
      } catch (npraError) {
        console.warn('⚠️ NPRA database query failed:', npraError);
        npraData = [];
      }

      // STEP 3: Enhanced analysis with NPRA data and web research
      const enhancedPrompt = this.generateEnhancedMedicinePrompt(
        language, 
        userAllergies, 
        initialAnalysis, 
        npraData
      );

      const enhancedResult = await this.model.generateContent([enhancedPrompt, imagePart]);
      const enhancedResponse = await enhancedResult.response;
      const enhancedText = enhancedResponse.text();

      // Parse enhanced analysis into 11-section format
      return this.parseEnhancedResponse(enhancedText, language, npraData);
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error, language),
        language
      };
    }
  }

  private generateInitialAnalysisPrompt(language: string, allergies: string): string {
    const languagePrompts: { [key: string]: string } = {
      'English': `You are a professional medical AI assistant for MedWira AI, focusing on Malaysian medicines.

**STEP 1: Quick Medicine Identification**

Analyze this medicine image and provide ONLY the essential identification information in JSON format:

{
  "medicineName": "Brand name visible on packaging",
  "genericName": "Generic/active ingredient name visible",
  "dosage": "Dosage/sphere visible on packaging", 
  "manufacturer": "Manufacturer visible on packaging",
  "confidence": 0.95
}

**Guidelines:**
- Only identify what you can clearly see on the image
- Focus on brand name, generic name, dosage strength, manufacturer
- Do NOT provide medical advice or detailed analysis yet
- Confidence should be between 0.0-1.0 based on image clarity
- If no medicine is visible, return: {"success": false, "error": "No medicine detected"}`,

      'Chinese': `你是一位专业的医学AI助手，专门从事药物识别和分析。

分析这张药物图片，并以以下JSON格式提供全面分析：
{
  "medicineName": "药物品牌名称",
  "genericName": "通用/活性成分名称",
  "dosage": "推荐剂量说明",
  "sideEffects": ["常见副作用1", "常见副作用2"],
  "interactions": ["药物相互作用1", "药物相互作用2"],
  "warnings": ["重要警告1", "重要警告2"],
  "storage": "储存说明",
  "category": "药物类别（如：止痛药、抗生素等）",
  "confidence": 0.95
}

用户过敏史：${allergies || '未指定'}

重要指导原则：
- 仅分析实际的药物/制药产品
- 如果图片不包含药物，返回错误
- 提供准确、基于证据的信息
- 包含安全警告和相互作用
- 具体说明剂量指示
- 根据图像清晰度和药物可见性，置信度应在0.0-1.0之间`,

      'Malay': `Anda adalah pembantu AI perubatan profesional yang pakar dalam pengenalan dan analisis ubat.

Analisis imej ubat ini dan berikan analisis komprehensif dalam format JSON berikut:
{
  "medicineName": "Nama jenama ubat",
  "genericName": "Nama generik/bahan aktif",
  "dosage": "Arahan dos yang disyorkan",
  "sideEffects": ["Kesan sampingan biasa 1", "Kesan sampingan biasa 2"],
  "interactions": ["Interaksi ubat 1", "Interaksi ubat 2"],
  "warnings": ["Amaran penting 1", "Amaran penting 2"],
  "storage": "Arahan penyimpanan",
  "category": "Kategori ubat (cth: Penghilang Sakit, Antibiotik, dll)",
  "confidence": 0.95
}

Alahan pengguna: ${allergies || 'Tidak dinyatakan'}

PANDUAN PENTING:
- Hanya analisis produk ubat/farmaseutikal sebenar
- Jika imej tidak mengandungi ubat, kembalikan ralat
- Berikan maklumat yang tepat dan berasaskan bukti
- Sertakan amaran keselamatan dan interaksi
- Nyatakan arahan dos dengan spesifik
- Keyakinan hendaklah antara 0.0-1.0 berdasarkan kejelasan imej dan kebolehlihatan ubat`
    };

    return languagePrompts[language] || languagePrompts['English'];
  }

  private parseInitialResponse(response: string): any {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       response.match(/(\{[\s\S]*?\})/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const jsonStr = jsonMatch[1];
      return JSON.parse(jsonStr);

    } catch (error) {
      console.error('Initial response parsing error:', error);
      return {
        success: false,
        error: 'Could not parse initial analysis'
      };
    }
  }

  private generateEnhancedMedicinePrompt(
    language: string, 
    allergies: string, 
    initialAnalysis: any, 
    npraData: NPRAMedicineData[]
  ): string {
    
    const npraInfo = npraData.length > 0 ? npraData.slice(0, 3).map(med => `
- **Product:** ${med.product}
- **Generic Name:** ${med.generic_name}  
- **Active Ingredient:** ${med.active_ingredient}
- **Manufacturer:** ${med.manufacturer}
- **Registration:** ${med.reg_no || med.ref_no}
- **Status:** ${med.status}`).join('') : '';

    const enhancedPrompts: { [key: string]: string } = {
      'English': `You are a highly specialized medical AI assistant for MedWira AI, focusing on Malaysian medicines.

**Your Goal:** Provide comprehensive, accurate, and safety-focused information for a given medicine, strictly following the 11-section Malaysian output format.

**Initial Image Analysis:** ${JSON.stringify(initialAnalysis)}

**NPRA DATABASE CONFIRMED DATA:**
${npraInfo}

**User Allergies:** ${allergies || 'None specified'}

**REQUIRED OUTPUT FORMAT (EXACTLY 11 SECTIONS):**
Please provide the analysis in this EXACT format:

**Packaging Detected:** [description from image analysis]
**Medicine Name:** [brand name + generic name from image/NPRA]
**Purpose:** [medical indication from web research - Malaysian context]
**Dosage Instructions:** [detailed instructions for adults/children]
**Side Effects:** [common/rare/overdose - web research based]
**Allergy Warning:** [allergy information + user allergies if any]  
**Drug Interactions:** [with drugs/food/alcohol - web research]
**Safety Notes:** [children/pregnancy/other warnings - web research]
**Storage:** [storage instructions - web research]

**Disclaimer:** This information is sourced from public websites, packaging details, and the NPRA database. For informational purposes only. Not medical advice. Consult a doctor or pharmacist before use.

**CRITICAL INSTRUCTIONS:**
1. **Use NPRA Data:** Prioritize NPRA-confirmed active ingredients and generic names
2. **Web Research:** Search authoritative sources (WHO, FDA, Malaysian NPRA, Drugs.com) for Purpose, Dosage, Side Effects, Interactions, Safety Notes
3. **Malaysian Context:** Focus on Malaysian pharmaceutical context and regulations
4. **Safety First:** Highlight ALL critical warnings and contraindications
5. **Professional Tone:** Medical terminology explained clearly, professional but accessible
6. **Accurate Only:** If information unavailable, state clearly - NO hallucination

Only respond with the 11-section analysis above. Do not add extra commentary or explanation.`,

      'Malay': `Anda adalah pembantu AI perubatan yang sangat pakar untuk MedWira AI, fokus pada ubat-ubatan Malaysia.

**Matlamat Anda:** Berikan maklumat yang komprehensif, tepat, dan berfokuskan keselamatan untuk ubat yang diberikan, mengikuti format output 11-seksyen Malaysia dengan ketat.

**Analisis Imej Awal:** ${JSON.stringify(initialAnalysis)}

**DATA DISAHKAN PANGKALAN DATA NPRA:**
${npraInfo}

**Alahan Pengguna:** ${allergies || 'Tiada dinyatakan'}

**FORMAT OUTPUT YANG DIPERLUKAN (TEPAT 11 SEKSYEN):**
Sila berikan analisis dalam format EXACT ini:

**Packaging Detected:** [penerangan dari analisis imej]
**Medicine Name:** [nama jenama + nama generik dari imej/NPRA]
**Purpose:** [petunjuk perubatan dari penyelidikan web - konteks Malaysia]
**Dosage Instructions:** [arahan terperinci untuk dewasa/kanak-kanak]
**Side Effects:** [biasa/jarang/overdosis - berdasarkan penyelidikan web]
**Allergy Warning:** [maklumat alahan + alahan pengguna jika ada]
**Drug Interactions:** [dengan ubat/makanan/alkohol - penyelidikan web]
**Safety Notes:** [ammaran untuk kanak-kanak/kehamilan/lain-lain - penyelidikan web]
**Storage:** [arahan penyimpanan - penyelidikan web]

**Disclaimer:** Maklumat ini diperoleh dari laman web awam, butiran pembungkusan, dan pangkalan data NPRA. Untuk tujuan maklumat sahaja. Bukan nasihat perubatan. Rujuk doktor atau ahli farmasi sebelum digunakan.

**ARAHAN KRITIKAL:**
1. **Gunakan Data NPRA:** Utamakan bahan aktif dan nama generik yang disahkan NPRA
2. **Penyelidikan Web:** Cari sumber berwibawa (WHO, FDA, NPRA Malaysia, Drugs.com) untuk Purpose, Dosage, Side Effects, Interactions, Safety Notes
3. **Konteks Malaysia:** Fokus pada konteks farmaseutikal Malaysia dan peraturan
4. **Keselamatan Pertama:** Ketengahkan SEMUA amaran dan kontraindikasi kritikal
5. **Ton Profesional:** Terminologi perubatan dijelaskan dengan jelas, profesional tetapi mudah difahami
6. **Tepat Sahaja:** Jika maklumat tidak tersedia, nyatakan dengan jelas - TIADA halusinasi

Hanya bertindak balas dengan analisis 11-seksyen di atas. Jangan tambah komen atau penjelasan tambahan.`
    };

    return enhancedPrompts[language] || enhancedPrompts['English'];
  }

  private parseEnhancedResponse(response: string, language: string, npraData: NPRAMedicineData[]): MedicineAnalysisResult {
    try {
      // Parse the enhanced response which should be in 11-section format
      const lines = response.split('\n').filter(line => line.trim());
      
      const result: MedicineAnalysisResult = {
        success: true,
        language
      };

      // Extract each section
      for (const line of lines) {
        if (line.startsWith('**Packaging Detected:**')) {
          result.packagingDetected = line.replace('**Packaging Detected:**', '').trim();
        } else if (line.startsWith('**Medicine Name:**')) {
          const medicineInfo = line.replace('**Medicine Name:**', '').trim();
          const parts = medicineInfo.split('(');
          result.medicineName = parts[0].trim();
          if (parts[1]) {
            result.genericName = parts[1].replace(')', '').trim();
          }
        } else if (line.startsWith('**Purpose:**')) {
          result.purpose = line.replace('**Purpose:**', '').trim();
        } else if (line.startsWith('**Dosage Instructions:**')) {
          result.dosageInstructions = line.replace('**Dosage Instructions:**','').trim();
        } else if (line.startsWith('**Side Effects:**')) {
          result.sideEffects = [line.replace('**Side Effects:**', '').trim()];
        } else if (line.startsWith('**Allergy Warning:**')) {
          result.allergyWarning = line.replace('**Allergy Warning:**', '').trim();
        } else if (line.startsWith('**Drug Interactions:**')) {
          result.drugInteractions = line.replace('**Drug Interactions:**', '').trim();
        } else if (line.startsWith('**Safety Notes:**')) {
          result.safetyNotes = line.replace('**Safety Notes:**', '').trim();
        } else if (line.startsWith('**Storage:**')) {
          result.storage = line.replace('**Storage:**', '').trim();
        } else if (line.startsWith('**Disclaimer:**') || line.includes('Disclaimer:')) {
          result.disclaimer = line.replace(/\*\*Disclaimer:\*\*/g, '').trim();
        }
      }

      // Set confidence based on NPRA match
      if (npraData.length > 0) {
        result.confidence = 0.95;
      } else {
        result.confidence = 0.75;
      }

      return result;

    } catch (error) {
      console.error('Enhanced response parsing error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error, language),
        language
      };
    }
  }

  private parseResponse(response: string, language: string): MedicineAnalysisResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       response.match(/(\{[\s\S]*?\})/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const jsonStr = jsonMatch[1];
      const parsed = JSON.parse(jsonStr);

      return {
        success: true,
        medicineName: parsed.medicineName,
        genericName: parsed.genericName,
        dosage: parsed.dosage,
        sideEffects: parsed.sideEffects || [],
        interactions: parsed.interactions || [],
        warnings: parsed.warnings || [],
        storage: parsed.storage,
        category: parsed.category,
        confidence: parsed.confidence || 0.8,
        language
      };
    } catch (error) {
      console.error('Response parsing error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error, language),
        language
      };
    }
  }

  private getErrorMessage(error: any, language: string): string {
    const errorMessages: { [key: string]: { [key: string]: string } } = {
      'English': {
        'API_KEY_MISSING': 'API key not configured. Please contact support.',
        'INVALID_IMAGE': 'Invalid image format. Please upload a clear photo of medicine packaging.',
        'NO_MEDICINE_DETECTED': 'No medicine detected in the image. Please upload a clear photo of medicine packaging, pills, or tablets.',
        'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
        'RATE_LIMIT': 'Too many requests. Please wait a moment and try again.',
        'DEFAULT': 'Analysis failed. Please try again with a clearer image.'
      },
      'Chinese': {
        'API_KEY_MISSING': 'API密钥未配置。请联系技术支持。',
        'INVALID_IMAGE': '图像格式无效。请上传清晰的药物包装照片。',
        'NO_MEDICINE_DETECTED': '图像中未检测到药物。请上传清晰的药物包装、药丸或药片照片。',
        'NETWORK_ERROR': '网络错误。请检查您的连接并重试。',
        'RATE_LIMIT': '请求过多。请稍等片刻后重试。',
        'DEFAULT': '分析失败。请尝试上传更清晰的图像。'
      },
      'Malay': {
        'API_KEY_MISSING': 'Kunci API tidak dikonfigurasi. Sila hubungi sokongan.',
        'INVALID_IMAGE': 'Format imej tidak sah. Sila muat naik foto pembungkusan ubat yang jelas.',
        'NO_MEDICINE_DETECTED': 'Tiada ubat dikesan dalam imej. Sila muat naik foto pembungkusan ubat, pil, atau tablet yang jelas.',
        'NETWORK_ERROR': 'Ralat rangkaian. Sila semak sambungan anda dan cuba lagi.',
        'RATE_LIMIT': 'Terlalu banyak permintaan. Sila tunggu sebentar dan cuba lagi.',
        'DEFAULT': 'Analisis gagal. Sila cuba lagi dengan imej yang lebih jelas.'
      }
    };

    const langMessages = errorMessages[language] || errorMessages['English'];
    
    if (error.message?.includes('API_KEY')) return langMessages['API_KEY_MISSING'];
    if (error.message?.includes('Invalid image')) return langMessages['INVALID_IMAGE'];
    if (error.message?.includes('No medicine')) return langMessages['NO_MEDICINE_DETECTED'];
    if (error.message?.includes('network')) return langMessages['NETWORK_ERROR'];
    if (error.message?.includes('rate limit')) return langMessages['RATE_LIMIT'];
    
    return langMessages['DEFAULT'];
  }
}

// Export singleton instance
export const geminiAnalyzer = new GeminiMedicineAnalyzer();
