/**
 * Prompt Suggestion Service
 * Phase 2: Personalized Prompt Suggestions
 * 
 * Generates personalized prompt suggestions based on user's health profile,
 * medication stack, and chat history. Falls back to educational prompts for new users.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { HealthProfileService } from './health-profile-service';
import { chatHistoryManager } from './chat-history-manager';
import { supabase } from './supabase';

export interface PersonalizedPrompt {
  prompt: string;
  relevance: number; // 0-1 confidence score
  category: 'condition' | 'medication' | 'pattern' | 'prevention' | 'general';
}

/**
 * Check if user has significant health profile data for personalization
 */
function hasSignificantProfileData(profile: any): boolean {
  if (!profile) return false;
  
  return (
    (profile.known_conditions && profile.known_conditions.length > 0) ||
    (profile.medications && profile.medications.length > 0) ||
    (profile.symptoms && profile.symptoms.length > 0) ||
    (profile.patterns && profile.patterns.length > 0) ||
    (profile.triggers && profile.triggers.length > 0)
  );
}

/**
 * Format health profile context for AI prompt generation
 */
function formatHealthProfileContext(profile: any): string {
  if (!profile) return 'No health profile available.';
  
  const parts: string[] = [];
  
  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.sex) parts.push(`Sex: ${profile.sex}`);
  
  if (profile.known_conditions && profile.known_conditions.length > 0) {
    parts.push(`Known Conditions: ${profile.known_conditions.join(', ')}`);
  }
  if (profile.symptoms && profile.symptoms.length > 0) {
    parts.push(`Previous Symptoms: ${profile.symptoms.join(', ')}`);
  }
  if (profile.medications && profile.medications.length > 0) {
    parts.push(`Medications Mentioned: ${profile.medications.join(', ')}`);
  }
  if (profile.triggers && profile.triggers.length > 0) {
    parts.push(`Triggers: ${profile.triggers.join(', ')}`);
  }
  if (profile.patterns && profile.patterns.length > 0) {
    const patternStrings = profile.patterns.map((p: any) => 
      `${p.symptom} after ${p.trigger}`
    );
    parts.push(`Health Patterns: ${patternStrings.join('; ')}`);
  }
  if (profile.past_medical_history) {
    parts.push(`Past Medical History: ${profile.past_medical_history}`);
  }
  if (profile.family_history) {
    parts.push(`Family History: ${profile.family_history}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : 'No health data collected yet.';
}

/**
 * Format medication stack context for AI prompt generation
 */
function formatMedicationContext(medications: any[]): string {
  if (!medications || medications.length === 0) {
    return 'No active medications.';
  }
  
  return medications.map(m => 
    `${m.medicine_name}${m.generic_name ? ` (${m.generic_name})` : ''}`
  ).join(', ');
}

/**
 * Format chat history context for AI prompt generation
 */
function formatChatHistoryContext(chats: any[]): string {
  if (!chats || chats.length === 0) {
    return 'No recent chat history.';
  }
  
  // Extract recent topics (last 5 user messages)
  const recentTopics = chats
    .filter(c => c.message_type === 'user')
    .slice(-5)
    .map(c => c.message_text?.substring(0, 50))
    .filter(Boolean);
  
  return recentTopics.length > 0 
    ? `Recent topics: ${recentTopics.join('; ')}`
    : 'No recent topics.';
}

/**
 * Generate personalized prompt suggestions using Gemini AI
 * Returns personalized prompts if user has health profile, otherwise returns empty array (will use educational prompts)
 */
export async function generatePersonalizedPrompts(
  userId: string,
  language: string = 'English',
  limit: number = 5
): Promise<PersonalizedPrompt[]> {
  try {
    // 1. Load user's health profile
    const healthProfile = await HealthProfileService.loadUserHealthProfile(userId);
    
    // 2. Check if user has significant profile data
    if (!hasSignificantProfileData(healthProfile)) {
      // No significant data → Return empty array (will use educational prompts)
      console.log('ℹ️ [Prompt Suggestions] User has no significant health profile data, using educational prompts');
      return [];
    }
    
    // 3. Load medication stack
    let medications: any[] = [];
    try {
      const { data: medsData, error } = await supabase
        .from('user_medication_stack')
        .select('medicine_name, generic_name, active_ingredients')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (!error && medsData) {
        medications = medsData;
      }
    } catch (error) {
      console.warn('⚠️ [Prompt Suggestions] Error loading medication stack:', error);
    }
    
    // 4. Load recent chat history (last 10 conversations)
    let recentChats: any[] = [];
    try {
      recentChats = await chatHistoryManager.getUserChatHistory(userId, 1, 10);
    } catch (error) {
      console.warn('⚠️ [Prompt Suggestions] Error loading chat history:', error);
    }
    
    // 5. Prepare context for Gemini
    const profileContext = formatHealthProfileContext(healthProfile);
    const medicationContext = formatMedicationContext(medications);
    const chatContext = formatChatHistoryContext(recentChats);
    
    // 6. Use Gemini to generate personalized prompts in user's language
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.7, // Slightly creative for variety
        maxOutputTokens: 512,
      },
    });
    
    const prompt = `You are a helpful AI assistant that generates personalized health-related question suggestions.

USER HEALTH PROFILE:
${profileContext}

CURRENT MEDICATIONS:
${medicationContext}

RECENT CHAT TOPICS:
${chatContext}

Generate exactly ${limit} personalized prompt suggestions in ${language} language that:
1. Are highly relevant to the user's health profile and conditions
2. Reference their medications if applicable (e.g., "Can I take [medicine] with my [condition]?")
3. Are different from topics they've recently asked about
4. Are helpful and actionable
5. Written in natural ${language} language
6. Focus on safety, interactions, and health management

Return ONLY a valid JSON array of prompt strings:
["prompt 1", "prompt 2", "prompt 3", ...]

Example format:
["Can I take painkillers with my gastric condition?", "What foods should I avoid with my high blood pressure medication?", "How can I prevent gout flare-ups?", ...]

Return JSON array only:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON response
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to find JSON array in response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      console.warn('⚠️ [Prompt Suggestions] No JSON array found in Gemini response');
      return [];
    }
    
    // Parse JSON
    let prompts: string[];
    try {
      prompts = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ [Prompt Suggestions] Error parsing Gemini response:', parseError);
      return [];
    }
    
    // Validate and format prompts
    if (!Array.isArray(prompts) || prompts.length === 0) {
      console.warn('⚠️ [Prompt Suggestions] Invalid prompts array from Gemini');
      return [];
    }
    
    // Map to PersonalizedPrompt format
    return prompts.slice(0, limit).map((p, index) => ({
      prompt: String(p).trim(),
      relevance: 0.8 - (index * 0.1), // Higher relevance for first suggestions
      category: 'general' as const
    }));
    
  } catch (error) {
    console.error('❌ [Prompt Suggestions] Error generating personalized prompts:', error);
    // Return empty array to fallback to educational prompts
    return [];
  }
}

