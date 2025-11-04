/**
 * Health Profile Service
 * Phase 1.2: Health Profile Service
 * 
 * Manages user health profile data including:
 * - Personal details (age, sex, known conditions)
 * - Health keywords (symptoms, conditions, medications, triggers)
 * - Pattern data (symptom-trigger relationships)
 * - Consent tracking
 */

import { supabase } from './supabase';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface HealthPattern {
  symptom: string;
  trigger: string;
  frequency: number;
  confirmed: boolean;
  created_at?: string;
  last_seen_at?: string;
}

export interface DetailsCompleteness {
  age: boolean;
  sex: boolean;
  known_conditions: boolean;
  past_history: boolean;
  family_history: boolean;
}

export interface UserHealthProfile {
  id: string;
  user_id: string;
  
  // Personal Information
  age?: number | null;
  sex?: string | null;
  date_of_birth?: string | null;
  
  // Medical History
  known_conditions?: string[] | null;
  past_medical_history?: string | null;
  family_history?: string | null;
  
  // Health Keywords
  health_keywords?: string[] | null;
  symptoms?: string[] | null;
  conditions?: string[] | null;
  medications?: string[] | null;
  triggers?: string[] | null;
  
  // Patterns
  patterns?: HealthPattern[] | null;
  
  // Personal Details Status
  personal_details_collected?: boolean;
  details_collection_date?: string | null;
  details_completeness?: DetailsCompleteness | null;
  
  // Consent
  pattern_tracking_consent?: boolean;
  consent_given_at?: string | null;
  consent_withdrawn_at?: string | null;
  
  // Metadata
  last_extraction_at?: string | null;
  extraction_count?: number;
  total_chats_analyzed?: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface HealthKeywords {
  keywords?: string[];
  symptoms?: string[];
  conditions?: string[];
  medications?: string[];
  triggers?: string[];
}

// ============================================================================
// Phase 2.1: Pattern Detection
// ============================================================================

export interface PatternCandidate {
  symptom: string;
  trigger: string;
  confidence: number; // 0-1
  detectedAt: string;
  message: string; // Original message for context
}

// ============================================================================
// Health Profile Service
// ============================================================================

export class HealthProfileService {
  /**
   * Load user health profile
   * Returns profile or null if not exists
   */
  static async loadUserHealthProfile(userId: string): Promise<UserHealthProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_health_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Profile doesn't exist - this is OK (new user)
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('❌ Error loading health profile:', error);
        return null;
      }

      // Parse patterns JSONB if exists
      if (data.patterns && typeof data.patterns === 'string') {
        try {
          data.patterns = JSON.parse(data.patterns);
        } catch (e) {
          console.warn('⚠️ Error parsing patterns JSON:', e);
          data.patterns = [];
        }
      }

      return data as UserHealthProfile;
    } catch (error) {
      console.error('❌ Exception loading health profile:', error);
      return null;
    }
  }

  /**
   * Initialize health profile for new user
   * Creates empty profile if doesn't exist
   */
  static async initializeHealthProfile(userId: string): Promise<UserHealthProfile> {
    try {
      // Use database function to initialize
      const { error: functionError } = await supabase.rpc('initialize_user_health_profile', {
        user_uuid: userId
      });

      if (functionError) {
        // If function fails, try direct insert
        const { data, error } = await supabase
          .from('user_health_profiles')
          .insert([{ user_id: userId }])
          .select()
          .single();

        if (error) {
          // Check if profile already exists (race condition)
          if (error.code === '23505') { // Unique violation
            return await this.loadUserHealthProfile(userId) || {
              id: '',
              user_id: userId,
              extraction_count: 0,
              total_chats_analyzed: 0
            };
          }
          throw error;
        }

        return data as UserHealthProfile;
      }

      // Load the initialized profile
      const profile = await this.loadUserHealthProfile(userId);
      return profile || {
        id: '',
        user_id: userId,
        extraction_count: 0,
        total_chats_analyzed: 0
      };
    } catch (error) {
      console.error('❌ Error initializing health profile:', error);
      throw error;
    }
  }

  /**
   * Update health profile with new data
   * Merges arrays with deduplication
   */
  static async updateHealthProfile(
    userId: string,
    updates: Partial<UserHealthProfile>
  ): Promise<UserHealthProfile | null> {
    try {
      // Ensure profile exists first
      let profile = await this.loadUserHealthProfile(userId);
      if (!profile) {
        profile = await this.initializeHealthProfile(userId);
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Handle array fields (merge with deduplication)
      if (updates.symptoms) {
        updateData.symptoms = [...new Set([
          ...(profile.symptoms || []),
          ...updates.symptoms
        ])];
      }
      if (updates.conditions) {
        updateData.conditions = [...new Set([
          ...(profile.conditions || []),
          ...updates.conditions
        ])];
      }
      if (updates.medications) {
        updateData.medications = [...new Set([
          ...(profile.medications || []),
          ...updates.medications
        ])];
      }
      if (updates.triggers) {
        updateData.triggers = [...new Set([
          ...(profile.triggers || []),
          ...updates.triggers
        ])];
      }
      if (updates.health_keywords) {
        updateData.health_keywords = [...new Set([
          ...(profile.health_keywords || []),
          ...updates.health_keywords
        ])];
      }
      if (updates.known_conditions) {
        updateData.known_conditions = [...new Set([
          ...(profile.known_conditions || []),
          ...updates.known_conditions
        ])];
      }

      // Handle simple fields
      if (updates.age !== undefined) updateData.age = updates.age;
      if (updates.sex !== undefined) updateData.sex = updates.sex;
      if (updates.date_of_birth !== undefined) updateData.date_of_birth = updates.date_of_birth;
      if (updates.past_medical_history !== undefined) updateData.past_medical_history = updates.past_medical_history;
      if (updates.family_history !== undefined) updateData.family_history = updates.family_history;
      
      // Handle patterns (merge)
      if (updates.patterns) {
        const existingPatterns = (profile.patterns || []) as HealthPattern[];
        const newPatterns = updates.patterns as HealthPattern[];
        updateData.patterns = JSON.stringify([...existingPatterns, ...newPatterns]);
      }

      // Handle status fields
      if (updates.personal_details_collected !== undefined) {
        updateData.personal_details_collected = updates.personal_details_collected;
      }
      if (updates.details_collection_date !== undefined) {
        updateData.details_collection_date = updates.details_collection_date;
      }
      if (updates.details_completeness !== undefined) {
        updateData.details_completeness = updates.details_completeness;
      }
      if (updates.pattern_tracking_consent !== undefined) {
        updateData.pattern_tracking_consent = updates.pattern_tracking_consent;
      }
      if (updates.consent_given_at !== undefined) {
        updateData.consent_given_at = updates.consent_given_at;
      }
      if (updates.consent_withdrawn_at !== undefined) {
        updateData.consent_withdrawn_at = updates.consent_withdrawn_at;
      }

      // Handle metadata
      if (updates.last_extraction_at !== undefined) {
        updateData.last_extraction_at = updates.last_extraction_at;
      }
      if (updates.extraction_count !== undefined) {
        updateData.extraction_count = updates.extraction_count;
      }
      if (updates.total_chats_analyzed !== undefined) {
        updateData.total_chats_analyzed = updates.total_chats_analyzed;
      }

      const { data, error } = await supabase
        .from('user_health_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating health profile:', error);
        return null;
      }

      // Parse patterns if exists
      if (data.patterns && typeof data.patterns === 'string') {
        try {
          data.patterns = JSON.parse(data.patterns);
        } catch (e) {
          data.patterns = [];
        }
      }

      return data as UserHealthProfile;
    } catch (error) {
      console.error('❌ Exception updating health profile:', error);
      return null;
    }
  }

  /**
   * Update health keywords using database function
   * Uses database function for proper array merging and deduplication
   */
  static async updateHealthKeywords(
    userId: string,
    keywords: HealthKeywords
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_health_keywords', {
        user_uuid: userId,
        new_keywords: keywords.keywords || null,
        new_symptoms: keywords.symptoms || null,
        new_conditions: keywords.conditions || null,
        new_medications: keywords.medications || null,
        new_triggers: keywords.triggers || null
      });

      if (error) {
        console.error('❌ Error updating health keywords:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception updating health keywords:', error);
      return false;
    }
  }

  /**
   * Update personal details using database function
   */
  static async updatePersonalDetails(
    userId: string,
    details: {
      age?: number;
      sex?: string;
      known_conditions?: string[];
      past_history?: string;
      family_history?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_personal_details', {
        user_uuid: userId,
        age_value: details.age || null,
        sex_value: details.sex || null,
        known_conditions_value: details.known_conditions || null,
        past_history_value: details.past_history || null,
        family_history_value: details.family_history || null
      });

      if (error) {
        console.error('❌ Error updating personal details:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception updating personal details:', error);
      return false;
    }
  }

  /**
   * Add health pattern (when user consents)
   */
  static async addHealthPattern(
    userId: string,
    pattern: { symptom: string; trigger: string; frequency?: number }
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('add_health_pattern', {
        user_uuid: userId,
        symptom_text: pattern.symptom,
        trigger_text: pattern.trigger,
        frequency: pattern.frequency || 1
      });

      if (error) {
        console.error('❌ Error adding health pattern:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception adding health pattern:', error);
      return false;
    }
  }

  /**
   * Update pattern tracking consent
   */
  static async updatePatternTrackingConsent(
    userId: string,
    consent: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_pattern_tracking_consent', {
        user_uuid: userId,
        consent_given: consent
      });

      if (error) {
        console.error('❌ Error updating pattern tracking consent:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception updating pattern tracking consent:', error);
      return false;
    }
  }

  /**
   * Check if user has health profile
   */
  static async hasHealthProfile(userId: string): Promise<boolean> {
    try {
      const profile = await this.loadUserHealthProfile(userId);
      return profile !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get health profile summary (for AI context)
   * Returns formatted string for AI prompts
   */
  static formatHealthProfileForAI(profile: UserHealthProfile | null): string {
    if (!profile) {
      return 'No health profile available.';
    }

    const parts: string[] = [];

    // Personal details
    if (profile.age) parts.push(`Age: ${profile.age}`);
    if (profile.sex) parts.push(`Sex: ${profile.sex}`);
    if (profile.known_conditions && profile.known_conditions.length > 0) {
      parts.push(`Known Conditions: ${profile.known_conditions.join(', ')}`);
    }

    // Health keywords
    if (profile.symptoms && profile.symptoms.length > 0) {
      parts.push(`Previous Symptoms: ${profile.symptoms.join(', ')}`);
    }
    if (profile.medications && profile.medications.length > 0) {
      parts.push(`Medications: ${profile.medications.join(', ')}`);
    }
    if (profile.triggers && profile.triggers.length > 0) {
      parts.push(`Triggers: ${profile.triggers.join(', ')}`);
    }

    // Patterns
    if (profile.patterns && profile.patterns.length > 0) {
      const patternStrings = profile.patterns.map(p => 
        `${p.symptom} after ${p.trigger} (${p.frequency}x)`
      );
      parts.push(`Patterns: ${patternStrings.join('; ')}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'No health data collected yet.';
  }
}

// ============================================================================
// Keyword Extraction Service
// Phase 1.3: Keyword Extraction & Symptom Logging
// ============================================================================

/**
 * Extract health keywords from user message using Gemini AI
 * Detects: symptoms, conditions, medications, triggers
 * Also detects explicit symptom logging ("Logging symptoms: ...")
 */
export async function extractHealthKeywords(
  message: string,
  language: string = 'English',
  statusCallback?: (status: string) => void
): Promise<HealthKeywords> {
  try {
    // Phase 2 Enhancement: Status tracking
    if (statusCallback) {
      statusCallback('Extracting health information...');
    }
    
    // Check for explicit symptom logging
    const isExplicitLogging = detectSymptomLogging(message);
    
    // Initialize Gemini model
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.1, // Low temperature for accurate extraction
        maxOutputTokens: 1024,
      },
    });

    // Create extraction prompt
    const extractionPrompt = `Extract health-related keywords from the following message.
    
Message: "${message}"

Extract and return ONLY a valid JSON object with the following structure:
{
  "symptoms": ["symptom1", "symptom2"],
  "conditions": ["condition1", "condition2"],
  "medications": ["medication1", "medication2"],
  "triggers": ["trigger1", "trigger2"],
  "keywords": ["general keyword1", "general keyword2"]
}

Rules:
1. Extract symptoms mentioned (e.g., "pain", "headache", "nausea", "stomach ache", "gastric pain")
2. Extract medical conditions mentioned (e.g., "diabetes", "high blood pressure", "gout", "gastric issues")
3. Extract medications mentioned (medicine names, brand names, generic names)
4. Extract triggers mentioned (e.g., "spicy food", "alcohol", "late night meals")
5. Extract general health keywords (any health-related terms)
6. Normalize terms: "stomach" = "gastric", "high BP" = "high blood pressure"
7. Return empty arrays if nothing found
8. Return ONLY valid JSON, no other text

${isExplicitLogging ? 'Note: User is explicitly logging symptoms. Extract all symptoms mentioned.' : ''}

Return JSON:`;

    // Call Gemini API
    const result = await model.generateContent(extractionPrompt);
    const responseText = result.response.text();

    // Parse JSON response
    // Try to extract JSON from response (might have markdown code blocks)
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to find JSON object in response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Parse JSON
    let extracted: HealthKeywords;
    try {
      extracted = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Error parsing Gemini response:', parseError);
      console.error('Response text:', responseText);
      // Return empty keywords if parsing fails
      return {
        symptoms: [],
        conditions: [],
        medications: [],
        triggers: [],
        keywords: []
      };
    }

    // Normalize and clean extracted keywords
    const normalize = (arr: string[] | undefined): string[] => {
      if (!arr || !Array.isArray(arr)) return [];
      return arr
        .map(item => item?.trim().toLowerCase())
        .filter(item => item && item.length > 0)
        .filter((item, index, self) => self.indexOf(item) === index); // Deduplicate
    };

    return {
      symptoms: normalize(extracted.symptoms),
      conditions: normalize(extracted.conditions),
      medications: normalize(extracted.medications),
      triggers: normalize(extracted.triggers),
      keywords: normalize(extracted.keywords),
    };
  } catch (error) {
    console.error('❌ Error extracting health keywords:', error);
    // Return empty keywords on error
    return {
      symptoms: [],
      conditions: [],
      medications: [],
      triggers: [],
      keywords: []
    };
  }
}

/**
 * Detect explicit symptom logging
 * Checks for patterns like "Logging symptoms:", "Log symptoms:", etc.
 */
export function detectSymptomLogging(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  const loggingPatterns = [
    'logging symptoms',
    'log symptoms',
    'symptom logging',
    'recording symptoms',
    'track symptoms',
    'save symptoms',
    'log my symptoms',
    'logging my symptoms'
  ];

  return loggingPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Extract symptoms from explicit logging message
 * Example: "Logging symptoms: gastric pain, headache, fatigue"
 */
export function extractSymptomsFromLogging(message: string): string[] {
  if (!detectSymptomLogging(message)) {
    return [];
  }

  // Extract symptoms after "Logging symptoms:" or similar patterns
  const patterns = [
    /(?:logging|log|recording|track|save)\s+symptoms?\s*:?\s*(.+)/i,
    /symptoms?\s*:?\s*(.+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      // Split by comma, semicolon, or "and"
      const symptoms = match[1]
        .split(/[,;]|\sand\s/i)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);
      return symptoms;
    }
  }

  return [];
}

/**
 * Phase 2.1: Detect symptom-trigger patterns from message
 * Uses Gemini to intelligently detect patterns like "gastric pain after spicy food"
 * 
 * @param message - User message to analyze
 * @param extractedKeywords - Already extracted keywords (optional, will extract if not provided)
 * @param language - Language of the message (default: 'English')
 * @returns PatternCandidate if pattern detected, null otherwise
 */
export async function detectPatterns(
  message: string,
  extractedKeywords?: HealthKeywords,
  language: string = 'English',
  statusCallback?: (status: string) => void
): Promise<PatternCandidate | null> {
  try {
    console.log('🔍 [Phase 2.1] Detecting patterns in message...');
    
    // Phase 2 Enhancement: Status tracking
    if (statusCallback) {
      statusCallback('Detecting health patterns...');
    }

    // If keywords not provided, extract them first
    let keywords = extractedKeywords;
    if (!keywords) {
      keywords = await extractHealthKeywords(message, language, statusCallback);
    }

    // Check if we have both symptom and trigger
    const hasSymptom = keywords.symptoms && keywords.symptoms.length > 0;
    const hasTrigger = keywords.triggers && keywords.triggers.length > 0;

    // Quick check: If no symptom or trigger, no pattern possible
    if (!hasSymptom || !hasTrigger) {
      console.log('ℹ️ [Phase 2.1] No pattern detected: missing symptom or trigger');
      return null;
    }

    // Use Gemini to detect pattern relationship
    // This ensures we detect actual cause-effect relationships, not just co-occurrence
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.1, // Low temperature for accurate detection
        maxOutputTokens: 512,
      },
    });

    // Create pattern detection prompt
    const patternPrompt = `Analyze this message and detect if there's a symptom-trigger pattern.
    
Message: "${message}"

Symptoms found: ${keywords.symptoms?.join(', ') || 'none'}
Triggers found: ${keywords.triggers?.join(', ') || 'none'}

Detect if there's a clear relationship where a trigger causes a symptom.
Examples:
- "gastric pain after eating spicy food" → symptom: "gastric pain", trigger: "spicy food"
- "headache when I drink coffee" → symptom: "headache", trigger: "coffee"
- "stomach ache after late meals" → symptom: "stomach ache", trigger: "late meals"

Return ONLY a valid JSON object:
{
  "pattern_detected": true/false,
  "symptom": "symptom text" or null,
  "trigger": "trigger text" or null,
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}

Rules:
1. Only return pattern_detected: true if there's a clear cause-effect relationship
2. If symptom and trigger are mentioned but not related, return pattern_detected: false
3. Confidence should reflect how clear the relationship is (1.0 = very clear, 0.5 = somewhat clear)
4. Return ONLY valid JSON, no other text

Return JSON:`;

    // Call Gemini API
    const result = await model.generateContent(patternPrompt);
    const responseText = result.response.text();

    // Parse JSON response
    let jsonText = responseText.trim();
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let detected: any;
    try {
      detected = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ [Phase 2.1] Error parsing pattern detection response:', parseError);
      return null;
    }

    // Check if pattern was detected
    if (!detected.pattern_detected || !detected.symptom || !detected.trigger) {
      console.log('ℹ️ [Phase 2.1] No pattern detected by Gemini');
      return null;
    }

    // Validate confidence
    const confidence = Math.max(0, Math.min(1, detected.confidence || 0.5));

    // Create pattern candidate
    const pattern: PatternCandidate = {
      symptom: detected.symptom.toLowerCase().trim(),
      trigger: detected.trigger.toLowerCase().trim(),
      confidence: confidence,
      detectedAt: new Date().toISOString(),
      message: message
    };

    console.log('✅ [Phase 2.1] Pattern detected:', {
      symptom: pattern.symptom,
      trigger: pattern.trigger,
      confidence: pattern.confidence
    });

    return pattern;
  } catch (error) {
    console.error('❌ [Phase 2.1] Error detecting patterns:', error);
    return null;
  }
}

