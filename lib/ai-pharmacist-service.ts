/**
 * AI Pharmacist Service - Professional Medicine Assistant
 * 
 * This service transforms MedWira from a medicine scanner into a comprehensive
 * AI pharmacist that can handle any medicine-related conversation.
 * 
 * Features:
 * - Professional pharmacist persona
 * - Text-only queries (no photo required)
 * - Photo analysis when provided
 * - Food-drug and drug-drug interactions
 * - Medication stack tracking
 * - Conversational follow-up questions
 */

import { DatabaseService } from './supabase';
import { npraProductLookup } from './npraDatabase';
import { HealthProfileService } from './health-profile-service';
import { supabase } from './supabase';
import { AIProcessingStage, getStatusMessage } from './ai-status-types';

export interface PharmacistAnalysisResult {
  success: boolean;
  message: string;
  messageType: 'text' | 'image' | 'interaction_warning';
  medicineName?: string;
  genericName?: string;
  dosage?: string;
  sideEffects?: string[];
  interactions?: string[];
  warnings?: string[];
  storage?: string;
  category?: string;
  confidence?: number;
  error?: string | 'QUOTA_EXCEEDED' | 'AUTH_ERROR' | 'UNKNOWN_ERROR' | 'RATE_LIMIT_EXCEEDED';
  language?: string;
  // Enhanced fields for pharmacist responses
  pharmacistAdvice?: string;
  followUpQuestions?: string[];
  medicationContext?: string;
  interactionAnalysis?: string;
  // Database integration
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

export interface UserMedicationContext {
  currentMedications: Array<{
    name: string;
    activeIngredients: string;
    frequency: string;
    startDate: string;
  }>;
  allergies: string[];
  medicalConditions?: string[];
}

/**
 * AI Pharmacist class - Professional Medicine Assistant
 * 
 * Acts as a professional pharmacist who can:
 * - Answer any medicine-related question
 * - Analyze medicine photos when provided
 * - Check food-drug and drug-drug interactions
 * - Provide dosage and safety information
 * - Give professional advice with appropriate disclaimers
 */
export class AIPharmacistService {
  private model: any;

  constructor() {
    console.log('✅ AIPharmacistService: Professional AI pharmacist initialized');
    this.initializeModel();
  }

  private async initializeModel() {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      this.model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro",
        generationConfig: {
          temperature: 0.3, // More consistent for medical advice
          maxOutputTokens: 4096,
        }
      });
      console.log('✅ AI Pharmacist model initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Pharmacist model:', error);
      this.model = null;
    }
  }

  /**
   * Main conversation handler - routes to appropriate analysis method
   * Phase 1.4: Enhanced with userId parameter for health profile loading
   */
  async handleConversation(
    userMessage: string,
    imageBase64?: string,
    userContext?: UserMedicationContext,
    language: string = 'English',
    statusCallback?: (status: string) => void,
    userId?: string
  ): Promise<PharmacistAnalysisResult> {
    const analysisId = `pharmacist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 [${analysisId}] ===== AI PHARMACIST CONVERSATION =====`);
    console.log(`📊 [${analysisId}] Message: "${userMessage}"`);
    console.log(`📊 [${analysisId}] Has image: ${!!imageBase64}`);
    console.log(`📊 [${analysisId}] User context:`, userContext);

    if (!this.model) {
      await this.initializeModel();
      if (!this.model) {
        return {
          success: false,
          message: 'AI Pharmacist service temporarily unavailable. Please try again later.',
          messageType: 'text' as const,
          language
        };
      }
    }

    try {
      statusCallback?.('Analyzing your question...');

      // Determine if this is a text-only query or needs image analysis
      if (imageBase64) {
        return await this.analyzeMedicineWithImage(userMessage, imageBase64, userContext, language, statusCallback);
      } else {
        return await this.handleTextOnlyQuery(userMessage, userContext, language, statusCallback, userId);
      }

    } catch (error) {
      console.error(`❌ [${analysisId}] AI Pharmacist error:`, error);
      return {
        success: false,
        message: `I apologize, but I encountered an error while processing your question. Please try again or consult with a healthcare professional.`,
        messageType: 'text' as const,
        language
      };
    }
  }

  /**
   * Handle text-only medicine questions
   * Phase 1.4: Enhanced with health profile integration
   */
  private async handleTextOnlyQuery(
    userMessage: string,
    userContext?: UserMedicationContext,
    language: string = 'English',
    statusCallback?: (status: string) => void,
    userId?: string
  ): Promise<PharmacistAnalysisResult> {
    
    // Phase 1.4: Load user health profile
    let healthProfile = null;
    // Phase 1.4 Enhancement: Load current medications from medication_stack
    let currentMedicationsFromStack: Array<{
      name: string;
      genericName: string;
      activeIngredients: string;
      frequency: string;
      dosage: string;
    }> = [];
    
    if (userId) {
      try {
        // Phase 2 Enhancement: Realistic status tracking
        if (statusCallback) {
          const statusMsg = getStatusMessage(AIProcessingStage.LOADING_PROFILE, language);
          statusCallback(statusMsg || AIProcessingStage.LOADING_PROFILE);
        }
        
        // Load health profile and medications in parallel for better performance
        const [healthProfileResult, medicationsResult] = await Promise.all([
          HealthProfileService.loadUserHealthProfile(userId),
          supabase
            .from('user_medication_stack')
            .select('medicine_name, generic_name, active_ingredients, frequency, dosage')
            .eq('user_id', userId)
            .eq('is_active', true)
        ]);
        
        // Process health profile
        healthProfile = healthProfileResult;
        if (!healthProfile) {
          healthProfile = await HealthProfileService.initializeHealthProfile(userId);
        }
        
        // Process medications
        if (statusCallback) {
          const statusMsg = getStatusMessage(AIProcessingStage.LOADING_MEDICATIONS, language);
          statusCallback(statusMsg || AIProcessingStage.LOADING_MEDICATIONS);
        }
        
        if (!medicationsResult.error && medicationsResult.data) {
          currentMedicationsFromStack = medicationsResult.data.map((m): {
            name: string;
            genericName: string;
            activeIngredients: string;
            frequency: string;
            dosage: string;
          } => ({
            name: m.medicine_name || '',
            genericName: m.generic_name || '',
            activeIngredients: m.active_ingredients || '',
            frequency: m.frequency || '',
            dosage: m.dosage || ''
          }));
          
          console.log(`✅ Loaded ${currentMedicationsFromStack.length} active medications from medication_stack`);
        } else if (medicationsResult.error) {
          console.warn('⚠️ Error loading medication stack (non-critical):', medicationsResult.error);
        }
        
        // Check health history if profile exists
        if (healthProfile && (
          (healthProfile.symptoms && healthProfile.symptoms.length > 0) || 
          (healthProfile.patterns && healthProfile.patterns.length > 0)
        )) {
          if (statusCallback) {
            const statusMsg = getStatusMessage(AIProcessingStage.CHECKING_HISTORY, language);
            statusCallback(statusMsg || AIProcessingStage.CHECKING_HISTORY);
          }
        }
      } catch (error) {
        console.error('❌ Error loading health profile:', error);
        // Continue without profile (graceful fallback)
      }
    }

    // Phase 2 Enhancement: Realistic status tracking
    if (statusCallback) {
      const statusMsg = getStatusMessage(AIProcessingStage.ANALYZING_QUESTION, language);
      statusCallback(statusMsg || AIProcessingStage.ANALYZING_QUESTION);
    }

    // Format health profile for AI context
    const healthProfileContext = healthProfile 
      ? HealthProfileService.formatHealthProfileForAI(healthProfile)
      : 'No health profile available.';

    // Merge medications from medication_stack with userContext (if provided)
    // Priority: userContext.currentMedications > currentMedicationsFromStack
    const allCurrentMedications = userContext?.currentMedications && userContext.currentMedications.length > 0
      ? userContext.currentMedications
      : currentMedicationsFromStack.map(m => ({
          name: m.name,
          frequency: m.frequency || '',
          activeIngredients: m.activeIngredients || ''
        }));

    const medicationsMentioned = healthProfile?.medications?.join(', ') || 'None';
    const currentMedicationsText = allCurrentMedications.length > 0
      ? allCurrentMedications.map(m => `${m.name}${m.frequency ? ` (${m.frequency})` : ''}`).join(', ')
      : 'None';

    // Create professional pharmacist prompt with health profile context
    const pharmacistPrompt = `You are a professional AI pharmacist assistant. Your role is to provide accurate, helpful, and safe information about medicines and health.

**IMPORTANT: Respond in ${language} language.**

**YOUR PERSONALITY:**
- Professional, knowledgeable, and caring
- Always cautious and safety-focused
- Encourages consulting healthcare professionals for medical decisions
- Provides clear, easy-to-understand information
- Asks clarifying questions when needed
- Uses user's health history to provide personalized advice

**USER HEALTH PROFILE:**
${healthProfileContext}

**USER CONTEXT:**
Current medications (from medication stack): ${currentMedicationsText}
Medications mentioned in conversations: ${medicationsMentioned}
${userContext ? `
Known allergies: ${userContext.allergies.join(', ') || 'None'}
Medical conditions: ${userContext.medicalConditions?.join(', ') || 'None specified'}
` : 'No additional user context provided'}

**SPECIFIC INSTRUCTIONS:**
1. Reference user's health history when relevant (e.g., "I remember you mentioned gastric pain before...")
2. Use patterns to provide context-aware advice (e.g., "I remember you mentioned gastric pain after spicy food before...")
3. Personalize recommendations based on known conditions and triggers
4. Cross-reference current question with previous symptoms/patterns
5. If user mentions a symptom and trigger together, naturally reference saved patterns in your response

**USER QUESTION:** "${userMessage}"

**RESPONSE GUIDELINES:**
1. **Safety First**: Always prioritize patient safety
2. **Food-Drug Interactions**: Check for common interactions (coffee, alcohol, grapefruit, etc.)
3. **Drug-Drug Interactions**: Consider user's current medications
4. **Dosage Information**: Provide appropriate dosage guidance
5. **Side Effects**: Mention common and serious side effects
6. **Storage**: Include storage instructions when relevant
7. **Professional Disclaimer**: Always recommend consulting healthcare professionals

**FORMAT YOUR RESPONSE AS:**

**Professional Assessment:**
[Your professional analysis and recommendations]

**Key Information:**
• [Important point 1]
• [Important point 2]
• [Important point 3]

**Safety Considerations:**
• [Safety warning 1]
• [Safety warning 2]

**Important Reminder:**
This information is for educational purposes only. Always consult with your healthcare provider or pharmacist for personalized medical advice.

**Follow-up Questions:**
• [Question 1 to help the user]
• [Question 2 to gather more context]

Note: You are a conversational AI pharmacist. Answer general health and medicine questions directly. Database lookup is optional and only when you identify a specific medicine name.`;

    try {
      // Phase 2 Enhancement: Realistic status tracking
      if (statusCallback) {
        const statusMsg = getStatusMessage(AIProcessingStage.GENERATING_RESPONSE, language);
        statusCallback(statusMsg || AIProcessingStage.GENERATING_RESPONSE);
      }
      
      const response = await this.model.generateContent(pharmacistPrompt);
      const aiResponse = response.response.text();
      
      // Phase 2 Enhancement: Finalizing status
      if (statusCallback) {
        const statusMsg = getStatusMessage(AIProcessingStage.FINALIZING, language);
        statusCallback(statusMsg || AIProcessingStage.FINALIZING);
      }

      // Extract medicine name from user message for database lookup
      const medicineName = this.extractMedicineName(userMessage);
      let dbResult = null;
      
      if (medicineName) {
        try {
          dbResult = await npraProductLookup(medicineName);
          console.log('✅ NPRA database lookup result:', dbResult ? 'FOUND' : 'NOT FOUND');
        } catch (error) {
          console.error('❌ Database lookup error:', error);
        }
      }

      return {
        success: true,
        message: aiResponse,
        messageType: 'text',
        language,
        // Include database info if found
        medicineName: dbResult ? (dbResult as any).product : medicineName,
        genericName: dbResult ? (dbResult as any).generic_name : undefined,
        activeIngredients: dbResult ? (dbResult as any).active_ingredient : undefined,
        databaseVerified: !!dbResult,
        rawAnalysis: aiResponse,
        pharmacistAdvice: aiResponse,
        disclaimer: 'This information is for educational purposes only. Always consult with your healthcare provider or pharmacist for personalized medical advice.',
        confidence: dbResult ? 0.95 : 0.85
      };

    } catch (error: any) {
      console.error('❌ Text-only query error:', error);
      
      // Handle Gemini API quota/rate limit errors specifically
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.error('❌ Gemini API quota exceeded:', error);
        return {
          success: false,
          message: `I'm currently experiencing high demand and cannot process your request right now. Please try again in a few minutes. If the issue persists, our API quota may be temporarily exceeded.`,
          messageType: 'text' as const,
          language,
          error: 'QUOTA_EXCEEDED'
        };
      }
      
      // Handle API authentication errors
      if (error?.status === 401 || error?.status === 403 || error?.message?.includes('API key')) {
        console.error('❌ Gemini API authentication error:', error);
        return {
          success: false,
          message: `AI service configuration error. Please contact support if this issue persists.`,
          messageType: 'text' as const,
          language,
          error: 'AUTH_ERROR'
        };
      }
      
      // Generic error handling
      return {
        success: false,
        message: 'I apologize, but I encountered an error while processing your question. Please try again or consult with a healthcare professional.',
        messageType: 'text' as const,
        language,
        error: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Handle medicine analysis with image
   */
  private async analyzeMedicineWithImage(
    userMessage: string,
    imageBase64: string,
    userContext?: UserMedicationContext,
    language: string = 'English',
    statusCallback?: (status: string) => void
  ): Promise<PharmacistAnalysisResult> {
    
    statusCallback?.('Analyzing medicine image...');

    // First extract medicine information from image
    const imageAnalysis = await this.analyzeMedicineImage(imageBase64, userContext, language, statusCallback);
    
    if (!imageAnalysis.success) {
      return imageAnalysis;
    }

    // Then provide pharmacist advice based on the image analysis and user question
    statusCallback?.('Providing pharmacist consultation...');

    const consultationPrompt = `You are a professional AI pharmacist. A user has uploaded a medicine image and asked: "${userMessage}"

**IMPORTANT: Respond in ${language} language.**

**MEDICINE IDENTIFIED FROM IMAGE:**
Medicine: ${imageAnalysis.medicineName || 'Medicine from image'}
Generic Name: ${imageAnalysis.genericName || 'Not specified'}
Active Ingredients: ${imageAnalysis.activeIngredients || 'Not specified'}
Purpose: ${imageAnalysis.purpose || 'Not specified'}

**USER CONTEXT:**
${userContext ? `
Current medications: ${userContext.currentMedications.map(m => `${m.name} (${m.frequency})`).join(', ') || 'None'}
Known allergies: ${userContext.allergies.join(', ') || 'None'}
` : 'No additional user context provided'}

**USER QUESTION:** "${userMessage}"

Provide a comprehensive pharmacist consultation that addresses their specific question while incorporating the medicine information from the image. Focus on:
1. Safety considerations
2. Interactions with current medications
3. Food-drug interactions
4. Proper usage instructions
5. Important warnings

Format your response professionally and include appropriate disclaimers.`;

    try {
      const response = await this.model.generateContent(consultationPrompt);
      const pharmacistAdvice = response.response.text();

      return {
        ...imageAnalysis,
        pharmacistAdvice,
        message: pharmacistAdvice,
        messageType: 'image',
        followUpQuestions: this.generateFollowUpQuestions(userMessage, imageAnalysis.medicineName)
      };

    } catch (error: any) {
      console.error('❌ Image consultation error:', error);
      
      // Handle Gemini API quota/rate limit errors
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.error('❌ Gemini API quota exceeded in image consultation:', error);
        return {
          ...imageAnalysis,
          pharmacistAdvice: `I can see the medicine in your image, but I'm currently experiencing high demand and cannot provide detailed consultation right now. Please try again in a few minutes.`,
          message: `I can see the medicine in your image, but I'm currently experiencing high demand and cannot provide detailed consultation right now. Please try again in a few minutes.`,
          messageType: 'image',
          error: 'QUOTA_EXCEEDED'
        };
      }
      
      return {
        ...imageAnalysis,
        pharmacistAdvice: 'I can see the medicine in your image, but I encountered an error providing detailed consultation. Please consult with your healthcare provider.',
        message: 'I can see the medicine in your image, but I encountered an error providing detailed consultation. Please consult with your healthcare provider.',
        messageType: 'image',
        error: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Analyze medicine image (adapted from original service)
   */
  private async analyzeMedicineImage(
    imageBase64: string,
    userContext?: UserMedicationContext,
    language: string = 'English',
    statusCallback?: (status: string) => void
  ): Promise<PharmacistAnalysisResult> {
    
    statusCallback?.('Extracting medicine information from image...');

    const textExtractionPrompt = `You are a specialized medicine text extraction AI. Extract ALL visible text from this medicine packaging systematically.

**REQUIRED OUTPUT FORMAT:**
Packaging Type: [Type of packaging observed]
Medicine Name: [Extracted medicine name exactly as you see it]
Registration Number: [MAL/NOT number if visible, or "Not visible"]
All Visible Text: [List all text found in order of prominence]

Focus on the MOST PROMINENT text for the product name. Only extract text that is actually visible.`;

    try {
      const imageData = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      const content = [textExtractionPrompt, {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageData.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      }];

      const response = await this.model.generateContent(content);
      const extractionResult = response.response.text();
      
      // Parse extraction results
      const packagingMatch = extractionResult.match(/Packaging Type:\s*([^\n]+)/i);
      const medicineNameMatch = extractionResult.match(/Medicine Name:\s*([^\n]+)/i);
      const regNumberMatch = extractionResult.match(/Registration Number:\s*([^\n]+)/i);
      
      const extractedMedicineName = medicineNameMatch ? medicineNameMatch[1].trim() : null;
      const extractedRegNumber = regNumberMatch && !regNumberMatch[1].toLowerCase().includes('not visible') 
        ? regNumberMatch[1].trim() : null;
      const packagingType = packagingMatch ? packagingMatch[1].trim() : 'Medicine packaging';

      // Optional database lookup - only if medicine name is clearly identified
      let dbResult = null;
      if (extractedMedicineName) {
        statusCallback?.('Searching medicine database...');
        try {
          dbResult = await npraProductLookup(extractedMedicineName, extractedRegNumber);
          console.log('✅ NPRA database lookup for image:', dbResult ? 'FOUND' : 'NOT FOUND');
        } catch (error) {
          console.error('❌ Database lookup error (non-critical):', error);
        }
      }

      statusCallback?.('Analyzing medicine information...');

      // Generate comprehensive analysis with conversational AI approach
      const comprehensivePrompt = `You are a professional AI pharmacist. A user has uploaded a medicine image.

**Image Analysis:**
- Packaging: ${packagingType}
- Medicine Name Visible: ${extractedMedicineName || 'Could not clearly identify'}
${dbResult ? `- Database Match: ${(dbResult as any).product} (${(dbResult as any).active_ingredient})` : '- Database: No match found (this is okay, provide general guidance)'}

**USER CONTEXT:**
${userContext ? `
Current medications: ${userContext.currentMedications.map(m => `${m.name} (${m.frequency})`).join(', ') || 'None'}
Known allergies: ${userContext.allergies.join(', ') || 'None'}
` : 'No additional user context provided'}

As an AI pharmacist, provide helpful information about this medicine:
1. What you can identify from the image
2. General information about this type of medicine (if identifiable)
3. Important safety considerations
4. Interaction warnings (check against user's current medications)
5. Food-drug interaction warnings
6. Storage requirements
7. Safety warnings
8. General health advice related to the medicine

**Important**: You are a conversational AI pharmacist. Even if the medicine is not in the database, provide helpful general information based on what you can see and your medical knowledge. Focus on education and safety.

Format as a professional, friendly pharmacist consultation.`;

      const comprehensiveResponse = await this.model.generateContent(comprehensivePrompt);
      const rawAnalysis = comprehensiveResponse.response.text();

      return {
        success: true,
        message: rawAnalysis,
        messageType: 'image',
        medicineName: dbResult ? (dbResult as any).product : extractedMedicineName || 'Medicine identified',
        genericName: dbResult ? (dbResult as any).generic_name : 'Analysis completed',
        activeIngredients: dbResult ? (dbResult as any).active_ingredient : null,
        confidence: dbResult ? 0.95 : 0.75,
        language,
        databaseVerified: !!dbResult,
        rawAnalysis,
        disclaimer: 'This information is for educational purposes only. Always consult with your healthcare provider or pharmacist for personalized medical advice.'
      };

    } catch (error: any) {
      console.error('❌ Image analysis error:', error);
      
      // Handle Gemini API quota/rate limit errors
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.error('❌ Gemini API quota exceeded in image analysis:', error);
        return {
          success: false,
          message: `I'm currently experiencing high demand and cannot analyze your medicine image right now. Please try again in a few minutes. If the issue persists, our API quota may be temporarily exceeded.`,
          messageType: 'text' as const,
          language,
          error: 'QUOTA_EXCEEDED'
        };
      }
      
      // Handle API authentication errors
      if (error?.status === 401 || error?.status === 403 || error?.message?.includes('API key')) {
        console.error('❌ Gemini API authentication error in image analysis:', error);
        return {
          success: false,
          message: `AI service configuration error. Please contact support if this issue persists.`,
          messageType: 'text' as const,
          language,
          error: 'AUTH_ERROR'
        };
      }
      
      return {
        success: false,
        message: 'I apologize, but I encountered an error analyzing the medicine image. Please try again or consult with your healthcare provider.',
        messageType: 'text' as const,
        language,
        error: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Extract medicine name from user message
   */
  private extractMedicineName(message: string): string | null {
    const commonMedicines = [
      'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin', 'vitamin c', 'vitamin d',
      'amoxicillin', 'penicillin', 'metformin', 'atorvastatin', 'omeprazole'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    for (const medicine of commonMedicines) {
      if (lowerMessage.includes(medicine)) {
        return medicine;
      }
    }
    
    return null;
  }

  /**
   * Generate follow-up questions based on context
   */
  private generateFollowUpQuestions(userMessage: string, medicineName?: string): string[] {
    const questions = [
      'Are you currently taking any other medications?',
      'Do you have any known allergies to medicines?',
      'When do you plan to take this medicine?',
      'Would you like to know about food interactions?'
    ];

    if (medicineName) {
      questions.unshift(`Would you like to know more about ${medicineName}?`);
    }

    return questions.slice(0, 3); // Return up to 3 questions
  }
}

// Export singleton instance
export const aiPharmacist = new AIPharmacistService();
