/**
 * API Route: Prompt Suggestions
 * Phase 2: Personalized Prompt Suggestions
 * 
 * Returns personalized prompts for returning users, or indicates to use educational prompts for new users
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePersonalizedPrompts } from '@/lib/prompt-suggestion-service';
import { HealthProfileService } from '@/lib/health-profile-service';

export const maxDuration = 30;

/**
 * Check if user has significant health profile data
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const language = searchParams.get('language') || 'English';
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    
    if (!userId) {
      return NextResponse.json({
        status: 'ERROR',
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    // Check if user has health profile with significant data
    const healthProfile = await HealthProfileService.loadUserHealthProfile(userId);
    
    if (!hasSignificantProfileData(healthProfile)) {
      // New user or no significant data → Use educational prompts (handled by frontend)
      return NextResponse.json({
        status: 'SUCCESS',
        data: {
          prompts: [],
          personalized: false,
          reason: 'No significant health profile data'
        }
      });
    }
    
    // User has profile data → Generate personalized prompts
    console.log(`🎯 [Prompt Suggestions] Generating personalized prompts for user ${userId}`);
    const prompts = await generatePersonalizedPrompts(userId, language, limit);
    
    if (prompts.length === 0) {
      // Gemini failed or returned empty → Fallback to educational
      return NextResponse.json({
        status: 'SUCCESS',
        data: {
          prompts: [],
          personalized: false,
          reason: 'Failed to generate personalized prompts'
        }
      });
    }
    
    return NextResponse.json({
      status: 'SUCCESS',
      data: {
        prompts: prompts.map(p => p.prompt),
        personalized: true
      }
    });
    
  } catch (error) {
    console.error('❌ [Prompt Suggestions API] Error:', error);
    return NextResponse.json({
      status: 'ERROR',
      error: 'Failed to generate prompt suggestions'
    }, { status: 500 });
  }
}

