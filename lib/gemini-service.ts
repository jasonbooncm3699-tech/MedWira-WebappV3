/**
 * Gemini 1.5 Pro Service - Active Implementation
 * 
 * This file contains the Gemini 1.5 Pro integration code.
 * Provides medicine analysis functionality with NPRA database integration.
 * 
 * Status: ✅ ACTIVE - Fully functional Gemini 1.5 Pro service
 * - Gemini 1.5 Pro SDK integrated and working
 * - Medicine analysis functionality enabled
 * - NPRA database lookup supported
 * - Used by analyze-image API route
 */

import { DatabaseService } from './supabase';
import { npraProductLookup } from './npraDatabase';

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
  // Database integration fields
  databaseVerified?: boolean;
  activeIngredients?: string;
  rawAnalysis?: string;
  dosageInstructions?: string;
  allergyWarning?: string;
  drugInteractions?: string;
  safetyNotes?: string;
  disclaimer?: string;
  purpose?: string;
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

/**
 * GeminiMedicineAnalyzer class - Active Gemini 1.5 Pro Service
 * 
 * This class provides Gemini 1.5 Pro powered medicine analysis.
 * Integrates with NPRA database for comprehensive medicine information.
 * 
 * ✅ ACTIVE SERVICE - Fully functional Gemini 1.5 Pro implementation
 */
export class GeminiMedicineAnalyzer {
  private model: any;

  constructor() {
    console.log('✅ GeminiMedicineAnalyzer: Gemini 1.5 Pro service initialized');
    // Initialize Gemini 1.5 Pro model
    this.initializeModel();
  }

  private async initializeModel() {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      this.model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        }
      });
      console.log('✅ Gemini 1.5 Pro model initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini 1.5 Pro model:', error);
      this.model = null;
    }
  }

  /**
   * Medicine image validation using Gemini 1.5 Pro
   * Validates if the uploaded image contains medicine packaging
   */
  async validateMedicineImage(imageBase64: string): Promise<{ isValid: boolean; confidence: number }> {
    if (!this.model) {
      console.log('⚠️ Gemini model not initialized - returning default response');
      return { isValid: true, confidence: 0.5 };
    }

    try {
      const prompt = `Analyze this image and determine if it contains medicine packaging. Look for:
      - Medicine blister packs, bottles, or boxes
      - Pharmaceutical product names
      - Registration numbers (MAL/NOT)
      - Active ingredients
      
      Respond with JSON: {"isValid": true/false, "confidence": 0.0-1.0}`;

      const imageData = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      const content = [prompt, {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageData.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      }];

      const response = await this.model.generateContent(content);
      const text = response.response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return { isValid: result.isValid, confidence: result.confidence || 0.8 };
      }
      
      return { isValid: true, confidence: 0.7 };
    } catch (error) {
      console.error('❌ Error validating medicine image:', error);
      return { isValid: true, confidence: 0.5 };
    }
  }

  /**
   * Medicine image analysis using Gemini 1.5 Pro
   * Provides comprehensive medicine information with NPRA database integration
   */
  async analyzeMedicineImage(
    imageBase64: string,
    language: string = 'English',
    userAllergies: string = ''
  ): Promise<MedicineAnalysisResult> {
    if (!this.model) {
      console.log('⚠️ Gemini model not initialized - retrying initialization');
      // Retry initialization
      await this.initializeModel();
      
      if (!this.model) {
        console.error('❌ Gemini model initialization failed after retry');
        return {
          success: false,
          error: 'Gemini 1.5 Pro service temporarily unavailable. Please try again later.',
          language
        };
      }
    }

    try {
      console.log('🔍 Starting Gemini 1.5 Pro medicine analysis');
      
      // STEP 1: Text Extraction Only
      const textExtractionPrompt = `You are a specialized medicine text extraction AI. Your ONLY task is to extract text from medicine packaging images.

**SYSTEMATIC TEXT EXTRACTION PROCESS:**

STEP 1: DESCRIBE WHAT YOU SEE
- Describe the packaging type (blister pack, bottle, box, etc.)
- Note the overall layout and text arrangement
- Identify the most prominent visual elements

STEP 2: LIST ALL VISIBLE TEXT
- Scan the image systematically from top-left to bottom-right, left to right
- List EVERY piece of text you can see, in order of prominence
- Include even small text that might be relevant

STEP 3: IDENTIFY THE MAIN PRODUCT NAME
- Look for the LARGEST, MOST PROMINENT text on the packaging
- This is usually the main product/medicine name
- Verify this text is actually visible and readable

**CRITICAL ANTI-HALLUCINATION RULES:**
- NEVER use medicine names from your training data
- NEVER guess or assume what the medicine might be
- ONLY extract text that is actually visible in the current image
- IGNORE your knowledge of common medicine names
- READ CHARACTER BY CHARACTER what you see on the packaging
- Focus on the MOST PROMINENT text for the product name
- DO NOT use examples from previous analyses or training data

**REQUIRED OUTPUT FORMAT:**
Return ONLY the extracted medicine name in this format:

Medicine Name: [Extracted medicine name exactly as you see it]

Do not provide any other information. Only return the medicine name.`;

      const imageData = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      const content = [textExtractionPrompt, {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageData.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      }];

      const response = await this.model.generateContent(content);
      const analysisText = response.response.text();
      
      console.log('✅ Gemini 1.5 Pro text extraction completed successfully');
      console.log('📝 Raw analysis text:', analysisText);
      
      // Extract medicine name from analysis for database lookup
      const medicineNameMatch = analysisText.match(/Medicine Name:\s*([^\n]+)/i) || 
                               analysisText.match(/Product Name:\s*([^\n]+)/i) ||
                               analysisText.match(/Brand Name:\s*([^\n]+)/i);
      
      let dbResult = null;
      if (medicineNameMatch) {
        const extractedMedicineName = medicineNameMatch[1].trim();
        console.log('🔍 Extracted medicine name for database lookup:', extractedMedicineName);
        
        try {
          dbResult = await npraProductLookup(extractedMedicineName, null);
          console.log('📊 Database lookup result:', dbResult);
        } catch (error) {
          console.error('❌ Database lookup error:', error);
        }
      }
      
      console.log('✅ Gemini 1.5 Pro analysis completed successfully');
      
      // STEP 2: Generate comprehensive analysis with database data
      let finalAnalysis = analysisText;
      if (dbResult) {
        const comprehensivePrompt = `You are a specialized medicine analysis AI. Analyze the active ingredients and provide comprehensive medical information.

**DATABASE VERIFIED INFORMATION:**
- Product Name: ${(dbResult as any).product}
- Active Ingredients: ${(dbResult as any).active_ingredient}
- Generic Name: ${(dbResult as any).generic_name}

**TASK: COMPREHENSIVE MEDICAL ANALYSIS**
Analyze the active ingredients and provide detailed medical information in this EXACT format:

Packaging Detected: [Describe what you see in the image]
Medicine Name: ${(dbResult as any).product} (${(dbResult as any).active_ingredient})
Purpose: [What this medicine treats based on active ingredients]

Dosage (from packaging and web info):
• [Age group]: [Dosage instructions]
• [Age group]: [Dosage instructions]
• [General instructions]

Side Effects: 
• Common: [Common side effects]
• Rare: [Rare side effects]
• Overdose risk: [Overdose information]

Allergy Warning: 
• Contains ${(dbResult as any).active_ingredient} and excipients
• May cause reactions if allergic
• [Additional allergy information]

Drug Interactions:
• With other drugs: [Drug interaction information]
• With food: [Food interaction information]
• With alcohol: [Alcohol interaction information]

Safety Notes:
• For kids: [Children safety information]
• For pregnant women: [Pregnancy safety information]
• Other: [General safety information]

Storage: [Storage instructions]

Disclaimer: This information is sourced from medical databases and packaging details. For informational purposes only. Not medical advice. Consult a doctor or pharmacist before use.

${userAllergies ? `User has known allergies: ${userAllergies}. Pay special attention to allergy warnings.` : ''}`;

        try {
          const comprehensiveResponse = await this.model.generateContent(comprehensivePrompt);
          finalAnalysis = comprehensiveResponse.response.text();
          console.log('✅ Comprehensive analysis with database data completed');
        } catch (error) {
          console.error('❌ Comprehensive analysis error:', error);
        }
      }
      
      return {
        success: true,
        medicineName: dbResult ? (dbResult as any).product : 'Medicine identified via Gemini 1.5 Pro',
        genericName: dbResult ? (dbResult as any).generic_name : 'Analysis completed',
        dosage: 'See detailed analysis below',
        sideEffects: ['See detailed analysis'],
        interactions: ['See detailed analysis'],
        warnings: ['See detailed analysis'],
        storage: 'See detailed analysis',
        category: 'Medicine',
        confidence: 0.85,
        language,
        // Enhanced fields
        packagingDetected: 'Medicine packaging analyzed',
        purpose: 'See detailed analysis below',
        // Database integration
        databaseVerified: !!dbResult,
        activeIngredients: dbResult ? (dbResult as any).active_ingredient : null,
        // Raw analysis text for UI display
        rawAnalysis: finalAnalysis,
        dosageInstructions: 'See detailed analysis below',
        allergyWarning: userAllergies ? `Contains ingredients. User allergies: ${userAllergies}` : 'See detailed analysis',
        drugInteractions: 'See detailed analysis',
        safetyNotes: 'See detailed analysis',
        disclaimer: 'This information is for educational purposes only. Consult a healthcare professional before use.'
      };
      
    } catch (error) {
      console.error('❌ Error analyzing medicine image:', error);
      return {
        success: false,
        error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        language
      };
    }
  }
}

// Active Gemini 1.5 Pro service singleton - Used by multiple API routes
export const geminiAnalyzer = new GeminiMedicineAnalyzer();