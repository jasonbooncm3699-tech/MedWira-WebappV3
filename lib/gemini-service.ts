import { GoogleGenerativeAI } from '@google/generative-ai';

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
}

export class GeminiMedicineAnalyzer {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeMedicineImage(
    imageBase64: string,
    language: string = 'English',
    userAllergies: string = ''
  ): Promise<MedicineAnalysisResult> {
    try {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const prompt = this.generateMedicinePrompt(language, userAllergies);
      
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      return this.parseResponse(text, language);
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error, language),
        language
      };
    }
  }

  private generateMedicinePrompt(language: string, allergies: string): string {
    const languagePrompts: { [key: string]: string } = {
      'English': `You are a professional medical AI assistant specializing in medicine identification and analysis. 

Analyze this medicine image and provide a comprehensive analysis in the following JSON format:
{
  "medicineName": "Brand name of the medicine",
  "genericName": "Generic/active ingredient name",
  "dosage": "Recommended dosage instructions",
  "sideEffects": ["Common side effect 1", "Common side effect 2"],
  "interactions": ["Drug interaction 1", "Drug interaction 2"],
  "warnings": ["Important warning 1", "Important warning 2"],
  "storage": "Storage instructions",
  "category": "Medicine category (e.g., Pain Relief, Antibiotic, etc.)",
  "confidence": 0.95
}

User allergies: ${allergies || 'None specified'}

IMPORTANT GUIDELINES:
- Only analyze actual medicine/pharmaceutical products
- If the image doesn't contain a medicine, return error
- Provide accurate, evidence-based information
- Include safety warnings and interactions
- Be specific about dosage instructions
- Confidence should be between 0.0-1.0 based on image clarity and medicine visibility`,

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
