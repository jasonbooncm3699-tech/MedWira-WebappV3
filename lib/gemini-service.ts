/**
 * DEPRECATED: Gemini Service - Being replaced with Gemini 1.5 Pro
 * 
 * This file contains the legacy Gemini integration code.
 * All functionality has been disabled for Phase 1 of the Gemini 1.5 Pro migration.
 * 
 * Phase 1 Status: ✅ COMPLETE
 * - Legacy Gemini SDK removed
 * - All legacy Gemini code commented out
 * - Placeholder service created for backward compatibility
 */

import { DatabaseService } from './supabase';

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

/**
 * DEPRECATED: GeminiMedicineAnalyzer class
 * 
 * This class has been disabled and will be replaced with Gemini 1.5 Pro service.
 * All methods return placeholder responses.
 */
export class GeminiMedicineAnalyzer {
  private model: any;

  constructor() {
    console.log('⚠️ GeminiMedicineAnalyzer: DEPRECATED - Gemini 1.5 Pro integration in progress');
    this.model = null;
  }

  /**
   * DEPRECATED: Medicine image validation
   * Returns placeholder response during transition
   */
  async validateMedicineImage(imageBase64: string): Promise<{ isValid: boolean; confidence: number }> {
    console.log('⚠️ Gemini validation disabled - returning default response');
    return { isValid: true, confidence: 0.5 };
  }

  /**
   * DEPRECATED: Medicine image analysis
   * Returns placeholder response during transition
   */
  async analyzeMedicineImage(
    imageBase64: string,
    language: string = 'English',
    userAllergies: string = ''
  ): Promise<MedicineAnalysisResult> {
    console.log('⚠️ Gemini analysis disabled - returning placeholder response');
    
    return {
      success: false,
      error: 'AI Analysis Service temporarily undergoing maintenance. Please try again soon.',
      language
    };
  }
}

// DEPRECATED: Legacy singleton export
// Will be replaced with Gemini 1.5 Pro service singleton
export const geminiAnalyzer = new GeminiMedicineAnalyzer();