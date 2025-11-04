# AI Database Integration Logic - Complete Workflow

## Overview
This document explains how the AI agent fills data in the database and retrieves it for future reference, creating a seamless AI ↔ Database workflow.

---

## Data Flow Architecture

### **Complete Cycle:**
```
1. User sends message
   ↓
2. AI analyzes message
   ↓
3. AI extracts health data (background)
   ↓
4. AI saves extracted data to database
   ↓
5. AI generates response (using profile data if available)
   ↓
6. Next conversation: AI retrieves profile data from database
   ↓
7. AI uses profile data for personalized response
```

---

## Phase 1: Data Extraction & Storage

### **Step 1: User Sends Message**

**Input:**
```typescript
{
  userMessage: "I'm having gastric pain after eating spicy food",
  userId: "ac4886f6-67de-454c-a4aa-6a18ce208616",
  language: "English"
}
```

**Action:**
- User message received via API
- User authenticated and identified
- Message ready for processing

---

### **Step 2: Parallel Processing**

**Two parallel tasks:**

#### **Task A: Load Existing Profile** (Fast, non-blocking)
```typescript
// Load user health profile from database
const healthProfile = await loadUserHealthProfile(userId);

// Returns:
{
  id: "...",
  user_id: "ac4886f6-...",
  symptoms: ["gastric pain", "headache"],
  conditions: ["high blood pressure"],
  medications: ["paracetamol"],
  triggers: ["spicy food", "alcohol"],
  patterns: [
    {
      "symptom": "gastric pain",
      "trigger": "spicy food",
      "frequency": 2,
      "confirmed": true
    }
  ],
  known_conditions: ["high blood pressure", "gastric issues"],
  age: 35,
  sex: "male",
  // ... other fields
}
```

**If profile doesn't exist:**
- Create empty profile automatically
- Return empty profile structure
- AI can still function (just no personalization)

#### **Task B: Extract Keywords** (Background, non-blocking)
```typescript
// Extract health keywords from message (background task)
const extractedKeywords = await extractHealthKeywords(userMessage, userId);

// Uses Gemini to extract:
{
  symptoms: ["gastric pain"],
  conditions: [],
  medications: [],
  triggers: ["spicy food"],
  keywords: ["gastric", "pain", "spicy", "food"]
}
```

**Key Point:** This runs in background - doesn't block AI response!

---

### **Step 3: AI Generates Response with Profile Context**

**Enhanced Prompt:**
```typescript
const pharmacistPrompt = `You are a professional AI pharmacist.

**USER HEALTH PROFILE:**
Previous Symptoms: ${healthProfile.symptoms.join(', ') || 'None'}
Known Conditions: ${healthProfile.known_conditions.join(', ') || 'None'}
Patterns: ${formatPatterns(healthProfile.patterns)}

**USER QUESTION:** "${userMessage}"

**SPECIFIC INSTRUCTIONS:**
1. If user mentions symptom from history, reference it: 
   "I remember you mentioned [symptom] before..."
2. Use patterns to provide context-aware advice
3. Consider known conditions when giving recommendations
...`;

const aiResponse = await gemini.generateContent(pharmacistPrompt);
```

**AI Response Example:**
```
"I remember you mentioned gastric pain before. Getting gastric pain 
after spicy food is a common pattern. Based on your history of gastric 
issues, I'd recommend..."
```

---

### **Step 4: Save Extracted Data to Database** (After Response Sent)

**Timing:** After AI response is sent to user (background task)

**Process:**
```typescript
// 1. Save extracted keywords to health profile
await updateHealthProfile(userId, extractedKeywords);

// 2. Update symptoms array (append, deduplicate)
// Before: symptoms: ["headache"]
// After: symptoms: ["headache", "gastric pain"]

// 3. Update triggers array (append, deduplicate)
// Before: triggers: ["alcohol"]
// After: triggers: ["alcohol", "spicy food"]

// 4. Increment counters
// extraction_count: 5 → 6
// total_chats_analyzed: 5 → 6
```

**Database Update:**
```sql
UPDATE user_health_profiles
SET 
  symptoms = array_append(symptoms, 'gastric pain'),
  triggers = array_append(triggers, 'spicy food'),
  health_keywords = array_append(health_keywords, 'gastric', 'pain', 'spicy', 'food'),
  last_extraction_at = NOW(),
  extraction_count = extraction_count + 1,
  total_chats_analyzed = total_chats_analyzed + 1,
  updated_at = NOW()
WHERE user_id = 'ac4886f6-...';
```

---

### **Step 5: Pattern Detection & Storage** (If Pattern Found)

**Detect Pattern:**
```typescript
// Pattern detected: symptom="gastric pain" + trigger="spicy food"
const pattern = await detectPattern(userMessage, userId, healthProfile);

// Returns:
{
  pattern_detected: true,
  symptom: "gastric pain",
  trigger: "spicy food",
  confidence: 0.9,
  reason: "Clear symptom-trigger relationship mentioned"
}
```

**Ask Permission:**
- AI response includes permission prompt at the end
- User clicks "Yes, remember"
- Pattern saved to database

**Save Pattern:**
```typescript
// User consented, save pattern
await savePattern(userId, {
  symptom: "gastric pain",
  trigger: "spicy food",
  frequency: 1,
  confirmed: true,
  created_at: new Date()
});

// Database update:
UPDATE user_health_profiles
SET 
  patterns = patterns || '[
    {
      "symptom": "gastric pain",
      "trigger": "spicy food",
      "frequency": 1,
      "confirmed": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]'::jsonb
WHERE user_id = 'ac4886f6-...';
```

---

## Phase 2: Data Retrieval & Usage

### **Next Conversation Flow**

#### **Step 1: Load Profile on Message Received**

```typescript
// User sends: "Stomach pain again"
// AI immediately loads profile:
const healthProfile = await loadUserHealthProfile(userId);

// Profile now contains:
{
  symptoms: ["gastric pain", "headache"], // Previous symptoms
  triggers: ["spicy food", "alcohol"],    // Previous triggers
  patterns: [                              // Saved patterns!
    {
      "symptom": "gastric pain",
      "trigger": "spicy food",
      "frequency": 2,  // Updated frequency
      "confirmed": true
    }
  ],
  known_conditions: ["high blood pressure", "gastric issues"],
  age: 35,
  sex: "male"
}
```

#### **Step 2: AI Uses Profile Data**

**Enhanced Prompt with Profile:**
```typescript
const pharmacistPrompt = `You are a professional AI pharmacist.

**USER HEALTH PROFILE:**
Previous Symptoms: gastric pain, headache
Known Conditions: high blood pressure, gastric issues
Patterns: 
  - gastric pain → triggered by spicy food (2 times)
Age: 35, Sex: male

**USER QUESTION:** "Stomach pain again"

**INSTRUCTIONS:**
1. Reference previous conversations:
   "I remember you mentioned gastric pain before, often after spicy food. 
    Is this similar?"
2. Use patterns:
   "Based on your pattern of gastric pain after spicy food, this might be 
    the same issue. Here's what helps..."
3. Consider conditions:
   "Since you have gastric issues, I'd recommend..."
...`;

const aiResponse = await gemini.generateContent(pharmacistPrompt);
```

**AI Response:**
```
"I remember you mentioned gastric pain before, often after spicy food. 
Based on your pattern, this might be the same issue. Here's what helps:

[Personalized advice based on history]
"
```

---

## Database Query Strategies

### **1. Quick Profile Load (Fast Query)**

**Use Case:** Load profile before AI response (needs to be fast)

**Query:**
```sql
SELECT * 
FROM user_health_profiles 
WHERE user_id = $1;
```

**Performance:**
- Indexed on `user_id` → O(1) lookup
- Typical response: < 50ms
- Small data size: ~5-10KB per user

**Optimization:**
- Cache in memory for session (short-term cache)
- Only load essential fields if needed

---

### **2. Pattern Lookup**

**Use Case:** Check if pattern already exists before asking permission

**Query:**
```sql
SELECT patterns 
FROM user_health_profiles 
WHERE user_id = $1;

-- Then check in application:
const existingPatterns = profile.patterns || [];
const patternExists = existingPatterns.some(p => 
  p.symptom === newPattern.symptom && 
  p.trigger === newPattern.trigger
);
```

**Optimization:**
- GIN index on `patterns` JSONB column
- Fast pattern matching

---

### **3. Symptom/Condition Search**

**Use Case:** Check if user mentioned symptom before

**Query:**
```sql
SELECT symptoms, conditions
FROM user_health_profiles 
WHERE user_id = $1 
  AND (symptoms @> ARRAY['gastric pain'] OR 
       conditions @> ARRAY['gastric issues']);
```

**Optimization:**
- GIN indexes on `symptoms[]` and `conditions[]` arrays
- Fast array containment checks

---

### **4. Timeline/Analytics Queries**

**Use Case:** Show health timeline or analytics

**Query:**
```sql
-- Get chat history with health profile data
SELECT 
  ch.created_at,
  ch.message_text,
  ch.ai_response,
  h.symptoms,
  h.patterns
FROM chat_history ch
LEFT JOIN user_health_profiles h ON ch.user_id = h.user_id
WHERE ch.user_id = $1
ORDER BY ch.created_at DESC
LIMIT 100;
```

**Optimization:**
- Index on `chat_history(user_id, created_at)`
- Consider pre-aggregating for timeline views

---

## Implementation: Service Layer

### **1. Health Profile Service** (`lib/health-profile-service.ts`)

```typescript
/**
 * Health Profile Service
 * Handles all health profile database operations
 */

export class HealthProfileService {
  
  /**
   * Load user health profile (fast, for AI context)
   */
  async loadUserHealthProfile(userId: string): Promise<HealthProfile | null> {
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase
      .from('user_health_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // Profile doesn't exist - create empty one
      return await this.initializeHealthProfile(userId);
    }
    
    return data;
  }
  
  /**
   * Extract keywords from message (background task)
   */
  async extractHealthKeywords(
    message: string, 
    userId: string
  ): Promise<ExtractedKeywords> {
    // Use Gemini to extract keywords
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const extractionPrompt = `Extract health information from: "${message}"
    
    Return JSON:
    {
      "symptoms": ["symptom1"],
      "conditions": ["condition1"],
      "medications": ["medication1"],
      "triggers": ["trigger1"],
      "keywords": ["keyword1"]
    }`;
    
    const response = await model.generateContent(extractionPrompt);
    const jsonMatch = response.response.text().match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return { symptoms: [], conditions: [], medications: [], triggers: [], keywords: [] };
  }
  
  /**
   * Update health profile with extracted keywords
   */
  async updateHealthProfile(
    userId: string,
    keywords: ExtractedKeywords
  ): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    
    // Get current profile
    const profile = await this.loadUserHealthProfile(userId);
    
    // Merge arrays (append new, deduplicate)
    const mergedSymptoms = [
      ...new Set([
        ...(profile?.symptoms || []),
        ...(keywords.symptoms || [])
      ])
    ];
    
    const mergedTriggers = [
      ...new Set([
        ...(profile?.triggers || []),
        ...(keywords.triggers || [])
      ])
    ];
    
    // Update database
    await supabase
      .from('user_health_profiles')
      .update({
        symptoms: mergedSymptoms,
        triggers: mergedTriggers,
        health_keywords: [
          ...new Set([
            ...(profile?.health_keywords || []),
            ...(keywords.keywords || [])
          ])
        ],
        last_extraction_at: new Date().toISOString(),
        extraction_count: (profile?.extraction_count || 0) + 1,
        total_chats_analyzed: (profile?.total_chats_analyzed || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  }
  
  /**
   * Save pattern (after user consent)
   */
  async savePattern(
    userId: string,
    pattern: {
      symptom: string;
      trigger: string;
      frequency: number;
      confirmed: boolean;
    }
  ): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    
    const profile = await this.loadUserHealthProfile(userId);
    const existingPatterns = profile?.patterns || [];
    
    // Check if pattern already exists
    const existingPatternIndex = existingPatterns.findIndex(
      (p: any) => p.symptom === pattern.symptom && p.trigger === pattern.trigger
    );
    
    if (existingPatternIndex >= 0) {
      // Update existing pattern (increment frequency)
      existingPatterns[existingPatternIndex].frequency += 1;
      existingPatterns[existingPatternIndex].confirmed = true;
    } else {
      // Add new pattern
      existingPatterns.push({
        ...pattern,
        created_at: new Date().toISOString()
      });
    }
    
    // Update database
    await supabase
      .from('user_health_profiles')
      .update({
        patterns: existingPatterns,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  }
  
  /**
   * Initialize empty health profile
   */
  async initializeHealthProfile(userId: string): Promise<HealthProfile> {
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase
      .from('user_health_profiles')
      .insert([{
        user_id: userId,
        symptoms: [],
        conditions: [],
        medications: [],
        triggers: [],
        health_keywords: [],
        patterns: [],
        pattern_tracking_consent: false,
        personal_details_collected: false,
        extraction_count: 0,
        total_chats_analyzed: 0
      }])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to initialize health profile: ${error.message}`);
    }
    
    return data;
  }
}

export const healthProfileService = new HealthProfileService();
```

---

### **2. Integration with AI Pharmacist Service**

**Enhanced `ai-pharmacist-service.ts`:**

```typescript
import { healthProfileService } from './health-profile-service';

export class AIPharmacistService {
  
  async handleConversation(
    userMessage: string,
    imageBase64?: string,
    userContext?: UserMedicationContext,
    language: string = 'English',
    statusCallback?: (status: string) => void,
    userId?: string // NEW: Add userId for profile loading
  ): Promise<PharmacistAnalysisResult> {
    
    // STEP 1: Load health profile (fast, parallel)
    let healthProfile = null;
    if (userId) {
      healthProfile = await healthProfileService.loadUserHealthProfile(userId);
    }
    
    // STEP 2: Generate AI response with profile context
    const result = await this.generateResponse(
      userMessage,
      imageBase64,
      userContext,
      healthProfile, // NEW: Pass profile to prompt
      language,
      statusCallback
    );
    
    // STEP 3: Extract keywords (background, after response sent)
    if (userId && userMessage) {
      // Run in background - don't block response
      healthProfileService.extractHealthKeywords(userMessage, userId)
        .then(keywords => {
          // Save extracted keywords to database
          healthProfileService.updateHealthProfile(userId, keywords);
        })
        .catch(error => {
          console.error('Background keyword extraction failed:', error);
          // Don't fail response if extraction fails
        });
    }
    
    return result;
  }
  
  private async generateResponse(
    userMessage: string,
    imageBase64: string | undefined,
    userContext: UserMedicationContext | undefined,
    healthProfile: HealthProfile | null, // NEW
    language: string,
    statusCallback?: (status: string) => void
  ): Promise<PharmacistAnalysisResult> {
    
    // Enhanced prompt with health profile
    const pharmacistPrompt = `You are a professional AI pharmacist.

**USER HEALTH PROFILE:**
${healthProfile ? `
Previous Symptoms: ${healthProfile.symptoms.join(', ') || 'None'}
Known Conditions: ${healthProfile.known_conditions.join(', ') || 'None'}
Current Medications: ${healthProfile.medications.join(', ') || 'None'}
Patterns: ${this.formatPatterns(healthProfile.patterns)}
Age: ${healthProfile.age || 'Not provided'}
Sex: ${healthProfile.sex || 'Not provided'}
` : 'No health history available yet'}

**USER QUESTION:** "${userMessage}"

**SPECIFIC INSTRUCTIONS:**
1. **Memory & Context:**
   - If user mentions symptom from history, reference it: 
     "I remember you mentioned [symptom] before..."
   - Use patterns to provide context-aware advice
   
2. **Personalization:**
   - Consider known conditions when giving recommendations
   - Age/sex-specific advice when relevant
   - Medication interactions with user's medications
   
3. **Pattern Detection:**
   - If you detect a clear symptom-trigger pattern, mention it after your answer
   - Example: "I noticed this pattern: [symptom] after [trigger]. 
               Would you like me to remember this?"

...`;
    
    // Generate response with enhanced prompt
    const response = await this.model.generateContent(pharmacistPrompt);
    return this.formatResponse(response);
  }
  
  private formatPatterns(patterns: any[]): string {
    if (!patterns || patterns.length === 0) return 'None';
    
    return patterns
      .map(p => `${p.symptom} → ${p.trigger} (${p.frequency}x)`)
      .join(', ');
  }
}
```

---

## Data Consistency & Validation

### **1. Keyword Deduplication**

**Challenge:** Same keyword might be extracted multiple times

**Solution:**
```typescript
// When updating symptoms array:
const mergedSymptoms = [
  ...new Set([ // Set automatically deduplicates
    ...existingSymptoms,
    ...newSymptoms
  ])
];
```

---

### **2. Condition Name Normalization**

**Challenge:** "high BP" vs "hypertension" vs "high blood pressure"

**Solution:**
```typescript
// Use database function to normalize
const normalizedCondition = await supabase.rpc(
  'normalize_condition_name',
  { condition_text: userInput }
);

// Or normalize in application:
const normalized = normalizeConditionName("high BP");
// Returns: "high blood pressure"
```

---

### **3. Pattern Frequency Updates**

**Challenge:** Pattern might be mentioned multiple times

**Solution:**
```typescript
// Check if pattern exists
const existingPattern = patterns.find(
  p => p.symptom === newPattern.symptom && 
       p.trigger === newPattern.trigger
);

if (existingPattern) {
  // Update frequency
  existingPattern.frequency += 1;
} else {
  // Add new pattern
  patterns.push(newPattern);
}
```

---

## Performance Optimization

### **1. Profile Loading Optimization**

**Strategy:** Cache profile in memory for session

```typescript
// Simple in-memory cache (per user session)
const profileCache = new Map<string, { profile: HealthProfile; timestamp: number }>();

async function loadProfileCached(userId: string): Promise<HealthProfile> {
  const cached = profileCache.get(userId);
  const cacheAge = Date.now() - (cached?.timestamp || 0);
  
  // Cache valid for 5 minutes
  if (cached && cacheAge < 5 * 60 * 1000) {
    return cached.profile;
  }
  
  // Load from database
  const profile = await healthProfileService.loadUserHealthProfile(userId);
  
  // Cache it
  profileCache.set(userId, {
    profile,
    timestamp: Date.now()
  });
  
  return profile;
}
```

---

### **2. Background Extraction**

**Strategy:** Don't block AI response for extraction

```typescript
// Send AI response immediately
const aiResponse = await generateResponse(...);

// Extract keywords in background (non-blocking)
extractAndSaveKeywords(userMessage, userId)
  .catch(error => console.error('Extraction failed:', error));

// Return response immediately
return aiResponse;
```

---

### **3. Batch Updates**

**Strategy:** Batch multiple updates together

```typescript
// Instead of multiple updates:
await updateSymptoms(...);
await updateTriggers(...);
await updatePatterns(...);

// Do one update:
await updateHealthProfile({
  symptoms: newSymptoms,
  triggers: newTriggers,
  patterns: newPatterns
});
```

---

## Error Handling & Fallbacks

### **1. Profile Load Failure**

**Fallback:** Continue without profile

```typescript
let healthProfile = null;
try {
  healthProfile = await loadUserHealthProfile(userId);
} catch (error) {
  console.error('Profile load failed:', error);
  // Continue without profile - AI can still respond
}
```

---

### **2. Extraction Failure**

**Fallback:** Don't fail response

```typescript
// Background extraction
extractHealthKeywords(message, userId)
  .then(keywords => updateHealthProfile(userId, keywords))
  .catch(error => {
    console.error('Extraction failed:', error);
    // Don't fail response - extraction is optional
  });
```

---

### **3. Database Update Failure**

**Fallback:** Retry or log for manual fix

```typescript
try {
  await updateHealthProfile(userId, keywords);
} catch (error) {
  console.error('Database update failed:', error);
  // Retry once
  await retryUpdateHealthProfile(userId, keywords);
}
```

---

## Summary: Complete Workflow

### **Message Received:**
1. ✅ Load health profile from database (< 50ms)
2. ✅ Generate AI response (with profile context)
3. ✅ Return response to user
4. ✅ Extract keywords (background)
5. ✅ Save keywords to database (background)

### **Next Message:**
1. ✅ Load health profile (now includes previous data)
2. ✅ AI references previous conversations
3. ✅ AI uses patterns for personalized advice
4. ✅ Cycle continues...

### **Key Principles:**
1. ✅ **Fast profile loading** (don't block response)
2. ✅ **Background extraction** (don't slow down AI)
3. ✅ **Graceful fallbacks** (continue even if profile fails)
4. ✅ **Data consistency** (deduplication, normalization)
5. ✅ **Performance optimization** (caching, batching)

---

**Status:** 🔴 **READY FOR IMPLEMENTATION**

**Next Steps:**
1. Implement `health-profile-service.ts`
2. Integrate with AI pharmacist service
3. Test data flow end-to-end
4. Monitor performance and optimize
5. Add error handling and fallbacks

