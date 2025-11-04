# AI Enhancement v3 - Logic Flow & Integration Design

## Overview
This document explains **how the AI detects and uses user health profiles** to provide personalized responses, and when to use health profile data vs when to provide direct answers.

---

## Current AI Flow (Before Health Profiles)

### Medicine Identifier (Image Upload)
```
1. User uploads medicine image
   ↓
2. Gemini extracts text from image
   ↓
3. Database lookup (NPRA medicines)
   ↓
4. AI generates medicine analysis
   ↓
5. Response displayed to user
   ↓
6. Save to chat_history
```

### Text Query (No Image)
```
1. User sends text question
   ↓
2. AI analyzes question
   ↓
3. Optional database lookup (if medicine name detected)
   ↓
4. AI generates response
   ↓
5. Response displayed to user
   ↓
6. Save to chat_history
```

---

## Enhanced AI Flow (With Health Profiles) - **PROPOSED DESIGN**

### Flow Overview
```
1. User sends message (text or image)
   ↓
2. PARALLEL PROCESSES:
   a) Load user health profile (if exists)
   b) Extract health keywords from message (background)
   ↓
3. AI analyzes WITH health profile context
   ↓
4. AI generates personalized response
   ↓
5. AI detects patterns (if applicable)
   ↓
6. Response + Pattern Permission Prompt (if needed)
   ↓
7. User sees response
   ↓
8. BACKGROUND: Save extracted keywords to health profile
```

---

## Detailed Logic Flow

### **Step 1: User Message Received**

**Input:**
- User message (text or image)
- User ID
- Session ID
- Language

**Actions:**
```typescript
// Pseudo-code
1. Load user health profile (async, non-blocking)
   - Get from user_health_profiles table
   - If doesn't exist, create empty profile
   
2. Extract health keywords from message (async, background)
   - Use Gemini to extract: symptoms, conditions, medications, triggers
   - This runs in parallel with AI response generation
   - Save results after response is sent
```

---

### **Step 2: AI Analysis with Health Profile Context**

**Key Decision: When to Use Health Profile?**

#### **Scenario A: Medicine Identifier (Image Upload)**

**Question:** Should AI use health profiles for medicine identification?

**Answer:** **YES, but selectively**

**Logic:**
```
1. Identify medicine from image (standard flow)
   ↓
2. Check user health profile:
   - Does user have allergies to ingredients in this medicine?
   - Is user taking medications that interact with this?
   - Has user asked about similar medicines before?
   ↓
3. Generate standard medicine analysis
   ↓
4. ADD PERSONALIZED WARNINGS at the end:
   - "Based on your history, you mentioned [allergy/condition]. 
     This medicine contains [ingredient] which may trigger [issue]."
   - "I remember you're taking [medication X]. 
     This medicine may interact with it."
```

**Example:**
```
User uploads: Paracetamol image
AI detects: Medicine = Paracetamol
Health profile check:
  - User has gastric pain pattern with spicy food
  - User asked about stomach pain 3 times
AI Response:
  [Standard paracetamol analysis]
  +
  **Personalized Note:**
  "I remember you mentioned gastric pain before. Paracetamol is generally 
   safe for stomach, but if you're experiencing gastric issues, take it 
   with food. Would you like me to suggest stomach-friendly alternatives?"
```

#### **Scenario B: Text Query (General Question)**

**Question:** When should AI use health profile?

**Answer:** **Always, but contextually**

**Logic:**
```
1. User asks question
   ↓
2. Load health profile:
   - Symptoms mentioned before
   - Conditions/triggers
   - Patterns (symptom + trigger relationships)
   ↓
3. AI analyzes question WITH health profile:
   - Reference previous conversations
   - Use patterns to provide context
   - Ask follow-up questions based on history
```

**Examples:**

**Example 1: User Asks About Symptom They Mentioned Before**
```
User: "What medicine for stomach pain?"
Health Profile: 
  - Previous mentions: gastric pain (3x)
  - Pattern: gastric pain → triggered by spicy food
AI Response:
  [Provides medicine recommendations]
  +
  "I remember you mentioned gastric pain before, often after spicy food. 
   Is this similar? This helps me give you the best advice."
```

**Example 2: User Asks About New Symptom**
```
User: "What medicine for headache?"
Health Profile:
  - No headache history
  - Has gastric pain pattern
AI Response:
  [Provides headache medicine recommendations]
  +
  "Since you mentioned gastric issues before, avoid aspirin-based painkillers 
   as they can irritate the stomach. Paracetamol would be safer for you."
```

**Example 3: Pattern Detection & Permission Request**
```
User: "Having ankle pain after drinking beer"
Health Profile:
  - First mention of ankle pain + alcohol
AI Response:
  [Provides immediate answer about pain management]
  +
  [AFTER ANSWER]
  "I noticed this pattern - ankle pain after alcohol. This could indicate gout. 
   Would you like me to remember this connection for future recommendations?"
   
[User clicks "Yes"]
  → Save pattern to health_profile.patterns
  → Next time: "I remember you mentioned ankle pain after alcohol..."
```

---

## Implementation Logic: When to Reference Health Profiles

### **Decision Tree**

```
START: User sends message
  ↓
Is user authenticated?
  ├─ NO → Use standard AI (no health profile)
  └─ YES → Continue
      ↓
Has health profile?
  ├─ NO → Use standard AI + Extract keywords (create profile)
  └─ YES → Check relevance
      ↓
Is message about:
  ├─ Medicine identification (image)
  │   ├─ Check allergies → Add warnings
  │   ├─ Check medication stack → Check interactions
  │   └─ Provide standard analysis + personalized notes
  │
  ├─ Symptom query (text)
  │   ├─ Symptom mentioned before?
  │   │   ├─ YES → Reference history + Ask if similar
  │   │   └─ NO → Check if pattern exists (symptom + trigger)
  │   │
  │   └─ New symptom?
  │       ├─ Check existing patterns → Warn about interactions
  │       └─ Provide answer + Extract keywords
  │
  ├─ General health question
  │   ├─ Check if relevant to user's profile
  │   └─ Use profile context if relevant
  │
  └─ Food/photo analysis
      ├─ Check triggers → Warn if dangerous
      └─ Suggest alternatives if needed
```

---

## Detailed Integration Points

### **1. Health Profile Loading Service**

**Location:** `lib/health-profile-service.ts` (NEW)

**Functions:**
```typescript
// Load user health profile
async function loadUserHealthProfile(userId: string): Promise<HealthProfile | null>

// Extract keywords from message (background task)
async function extractHealthKeywords(message: string, userId: string): Promise<ExtractedKeywords>

// Update health profile with new keywords
async function updateHealthProfile(userId: string, keywords: ExtractedKeywords): Promise<void>

// Detect patterns (symptom + trigger combinations)
async function detectPattern(message: string, userId: string): Promise<Pattern | null>

// Save pattern with user consent
async function savePattern(userId: string, pattern: Pattern): Promise<void>
```

---

### **2. AI Pharmacist Service Enhancement**

**Current:** `lib/ai-pharmacist-service.ts`

**Changes Needed:**

#### **Add Health Profile Context to Prompts**

**Before (Current):**
```typescript
const pharmacistPrompt = `You are a professional AI pharmacist...
USER QUESTION: "${userMessage}"
...`;
```

**After (Enhanced):**
```typescript
const pharmacistPrompt = `You are a professional AI pharmacist...

USER QUESTION: "${userMessage}"

USER HEALTH CONTEXT:
${healthProfile ? `
Previous symptoms mentioned: ${healthProfile.symptoms.join(', ') || 'None'}
Known conditions: ${healthProfile.conditions.join(', ') || 'None'}
Current medications: ${healthProfile.medications.join(', ') || 'None'}
Patterns: ${formatPatterns(healthProfile.patterns)}
` : 'No health history available'}

IMPORTANT INSTRUCTIONS:
1. If user mentions a symptom they mentioned before, reference it: 
   "I remember you mentioned [symptom] before..."
2. Use patterns to provide context-aware advice
3. If user mentions a new symptom + trigger combination, 
   provide answer FIRST, then ask permission to remember the pattern
4. Always prioritize safety - use health profile to warn about interactions
...`;
```

---

### **3. Medicine Identifier Integration**

**Current:** `app/api/analyze-image/route.ts`

**Enhancement:**

```typescript
// After medicine is identified
const medicineAnalysis = await geminiAnalyzer.analyzeMedicineImage(...);

// Load health profile
const healthProfile = await loadUserHealthProfile(userId);

// Add personalized warnings
if (healthProfile) {
  // Check allergies
  if (medicineAnalysis.activeIngredients) {
    const allergyWarnings = checkAllergyInteractions(
      medicineAnalysis.activeIngredients,
      healthProfile.symptoms,
      healthProfile.conditions
    );
    
    if (allergyWarnings.length > 0) {
      medicineAnalysis.allergyWarning = 
        `${medicineAnalysis.allergyWarning}\n\n**Personalized Warning:** ${allergyWarnings.join('\n')}`;
    }
  }
  
  // Check medication interactions
  if (healthProfile.medications.length > 0) {
    const interactionWarnings = checkDrugInteractions(
      medicineAnalysis.medicineName,
      healthProfile.medications
    );
    
    if (interactionWarnings.length > 0) {
      medicineAnalysis.drugInteractions = 
        `${medicineAnalysis.drugInteractions}\n\n**Based on Your Medications:** ${interactionWarnings.join('\n')}`;
    }
  }
  
  // Add contextual note
  if (healthProfile.patterns.length > 0) {
    medicineAnalysis.safetyNotes += 
      `\n\n**Personalized Note:** I remember you mentioned [pattern reference]. This medicine might be particularly relevant.`;
  }
}

return medicineAnalysis;
```

---

### **4. Pattern Detection & Permission Flow**

**When to Detect Patterns:**

1. **Symptom + Trigger Combination Detected:**
   ```
   User: "Ankle pain after drinking beer"
   → Pattern detected: symptom="ankle pain", trigger="alcohol"
   → Check if pattern already exists
   → If new pattern:
      a) Provide immediate answer
      b) AFTER answer, ask permission:
         "I noticed this pattern - ankle pain after alcohol. 
          Would you like me to remember this?"
   ```

2. **Frequency-Based Pattern:**
   ```
   User mentions "gastric pain" 3 times
   → Pattern frequency = 3
   → Ask: "I noticed you mentioned gastric pain 3 times. 
           Want me to track patterns?"
   ```

**Permission Prompt Timing:**

✅ **RECOMMENDED:** Ask AFTER providing answer (user sees value first)
❌ **NOT RECOMMENDED:** Ask BEFORE answer (interrupts flow)

**Important Clarification:**
- ❌ AI **NEVER** starts chats - user always initiates conversations
- ✅ AI provides answer **FIRST** (main response to user's question)
- ✅ **THEN**, at the end of the same response, AI adds permission prompt
- ✅ This way user sees value (the answer) before being asked for permission

**UI Flow - Single Response (Permission at End):**

```
STEP 1: User sends message
  User: "Ankle pain after drinking beer"
        ↓
STEP 2: AI generates response (all in ONE response message)
  ┌─────────────────────────────────────────────────┐
  │ AI Response Message:                             │
  │                                                 │
  │ [MAIN ANSWER - Appears first]                  │
  │ "For ankle pain after alcohol, this could       │
  │  indicate gout. Here are some recommendations: │
  │  • Rest your ankle                             │
  │  • Apply ice to reduce swelling                 │
  │  • Consider anti-inflammatory medication..."     │
  │                                                 │
  │ [PERMISSION PROMPT - Appears at end]           │
  │ ──────────────────────────────────────────     │
  │ 💡 I noticed this pattern: ankle pain after     │
  │    alcohol. This could indicate gout. Would    │
  │    you like me to remember this connection?    │
  │                                                 │
  │    [Yes, remember] [No thanks] [Maybe later]  │
  └─────────────────────────────────────────────────┘
        ↓
STEP 3: User sees answer first, then permission prompt
        ↓
STEP 4: User clicks "Yes, remember"
        ↓
STEP 5: Pattern saved (in background)
        ↓
STEP 6: Next conversation - AI references pattern
  User: "Ankle pain again"
  AI: "I remember you mentioned ankle pain after 
      alcohol before. This might be gout-related. 
      Here's what helps..."
```

**Visual Example in Chat Interface:**

```
┌────────────────────────────────────────────────┐
│ User Message:                                  │
│ "Ankle pain after drinking beer"              │
└────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────┐
│ AI Response (ALL IN ONE MESSAGE):               │
│                                                │
│ For ankle pain after alcohol, this could      │
│ indicate gout. Here are some recommendations: │
│                                                │
│ • Rest your ankle                             │
│ • Apply ice to reduce swelling                │
│ • Consider anti-inflammatory like ibuprofen   │
│ • Avoid alcohol to prevent flare-ups          │
│                                                │
│ [Separator line]                               │
│ ───────────────────────────────────────────── │
│                                                │
│ 💡 I noticed this pattern: ankle pain after   │
│    alcohol. This could indicate gout. Would   │
│    you like me to remember this connection    │
│    for future recommendations?               │
│                                                │
│    [Yes, remember] [No thanks] [Maybe later] │
└────────────────────────────────────────────────┘
```

**Key Points:**
1. ✅ User always starts the conversation (AI never initiates)
2. ✅ AI provides complete answer FIRST (user sees value)
3. ✅ Permission prompt appears at END of same response message
4. ✅ User sees answer before being asked for permission
5. ✅ Not interruptive - permission is optional add-on

---

## Response Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User Sends Message (Text or Image)                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ Load Health Profile │ (Async, fast)
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ Extract Keywords    │ (Background, non-blocking)
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │ AI Analysis with Health Profile Context       │
        │                                               │
        │ 1. Standard analysis (medicine/text)         │
        │ 2. Add personalized warnings/notes            │
        │ 3. Reference previous conversations          │
        │ 4. Check for patterns                        │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │ Generate Response                            │
        │ - Include health profile context              │
        │ - Add pattern permission prompt (if needed)  │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │ Display Response to User                     │
        │ - Show answer                                │
        │ - Show permission prompt (if applicable)     │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │ Background Tasks (After response sent)      │
        │ - Save extracted keywords to health profile  │
        │ - Save pattern (if user consented)           │
        │ - Update statistics                          │
        └───────────────────────────────────────────────┘
```

---

## Examples: When AI Uses Health Profiles

### **Example 1: Medicine Identifier + Allergy Warning**

```
User Action: Uploads Paracetamol image
Health Profile: User has gastric pain pattern with spicy food
AI Flow:
  1. Identify medicine: Paracetamol
  2. Check profile: Gastric pain pattern detected
  3. Generate standard analysis
  4. Add note: "I remember you mentioned gastric pain. 
              Paracetamol is safe for stomach."
```

### **Example 2: Symptom Query + Pattern Reference**

```
User: "What medicine for stomach pain?"
Health Profile: 
  - Gastric pain mentioned 3 times
  - Pattern: gastric pain → triggered by spicy food
AI Flow:
  1. Recognize symptom matches profile
  2. Provide medicine recommendations
  3. Reference history: "I remember you mentioned gastric pain before, 
                         often after spicy food. Is this similar?"
  4. Offer personalized advice
```

### **Example 3: Pattern Detection & Permission**

```
User: "Ankle pain after drinking beer"
Health Profile: No ankle pain pattern yet
AI Flow:
  1. Provide immediate answer about pain management
  2. Detect pattern: ankle pain + alcohol
  3. Ask permission: "I noticed this pattern - ankle pain after alcohol. 
                     Could indicate gout. Want me to remember this?"
  4. User clicks "Yes"
  5. Save pattern
  6. Next time: "I remember you mentioned ankle pain after alcohol..."
```

### **Example 4: Food Photo Analysis + Trigger Warning**

```
User: Uploads curry photo
Health Profile:
  - Pattern: gastric pain → triggered by spicy food
AI Flow:
  1. Analyze food: Contains chili peppers
  2. Check profile: Spicy food triggers gastric pain
  3. Warning: "This contains chili peppers. You mentioned gastric pain 
              after spicy food before. This might trigger discomfort. 
              Want me to suggest a gentler version?"
```

---

## Follow-Up Questions Based on Health Profiles

### **When to Ask Follow-Up Questions:**

1. **Symptom Previously Mentioned:**
   ```
   "I remember you mentioned [symptom] before. 
    Is this the same issue, or something different?"
   ```

2. **Pattern Detected:**
   ```
   "I noticed [symptom] after [trigger]. 
    Is this a recurring pattern for you?"
   ```

3. **Context Needed:**
   ```
   "To give you the best advice, I need to understand:
    - When did [symptom] start?
    - What did you eat today?
    - Pain level 1-10?"
   ```

4. **Medication Interaction:**
   ```
   "I see you're taking [medication X]. 
    This medicine may interact. Want me to check?"
   ```

---

## Recommendations

### **For Medicine Identifier:**

✅ **USE health profiles for:**
- Allergy warnings
- Medication interaction checks
- Personalized safety notes
- Context-aware recommendations

✅ **DON'T OVERWHELM with:**
- Too many personalization notes
- Unrelated history references
- Interrupting standard analysis flow

### **For Text Queries:**

✅ **ALWAYS check health profile:**
- Before answering
- To provide context
- To detect patterns
- To ask relevant follow-ups

✅ **NATURAL conversation flow:**
- Reference history naturally
- Ask follow-up questions contextually
- Don't force pattern detection

### **Permission Timing:**

✅ **Ask AFTER answer:**
- User sees value first
- Less interruptive
- Better user experience

❌ **Don't ask BEFORE answer:**
- Interrupts flow
- User doesn't see value yet
- Feels pushy

---

## Technical Implementation Checklist

- [ ] Create `lib/health-profile-service.ts`
- [ ] Add health profile loading to AI pharmacist service
- [ ] Update prompts to include health context
- [ ] Add pattern detection logic
- [ ] Create permission prompt UI component
- [ ] Update medicine identifier to use health profiles
- [ ] Add background keyword extraction
- [ ] Implement pattern saving with consent
- [ ] Add personalized warnings logic
- [ ] Test end-to-end flow

---

## Success Metrics

### **Phase 1: Basic Integration**
- ✅ Health profile loads in < 100ms
- ✅ AI references history in 30% of conversations
- ✅ Keyword extraction accuracy > 90%

### **Phase 2: Pattern Detection**
- ✅ Pattern detection accuracy > 80%
- ✅ Permission acceptance rate > 50%
- ✅ Users feel "AI remembers me"

### **Phase 3: Advanced Features**
- ✅ Personalized warnings shown in 70% of medicine identifications
- ✅ Follow-up questions improve answer quality
- ✅ User retention increases by 30%

---

**Status:** 🔴 **DESIGN COMPLETE - AWAITING REVIEW**

**Next Steps:**
1. Review this logic flow
2. Finalize when to use health profiles
3. Confirm permission prompt timing
4. Approve implementation approach
5. Begin technical implementation

