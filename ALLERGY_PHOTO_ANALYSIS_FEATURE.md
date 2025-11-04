# Allergy Photo Analysis Feature - AI Enhancement v3 Extension

## Overview
Add intelligent allergy photo analysis to the AI system. AI proactively asks users to upload allergy photos when relevant, analyzes photos with user context, and provides personalized advice.

---

## Feature: Intelligent Allergy Photo Analysis

### **What It Does:**
- **Proactive Request:** When user asks about allergies, AI intelligently asks for photo upload
- **Smart Detection:** AI detects if uploaded photo is allergy-related (skin rash, swelling, etc.)
- **Context-Aware Analysis:** AI analyzes allergy photos with user's health profile
- **Personalized Advice:** AI provides personalized recommendations based on photo + profile

---

## Feature Logic Flow

### **Scenario 1: User Asks About Allergy (Proactive Request)**

```
User: "I have a rash on my arm"
  ↓
AI detects allergy-related question
  ↓
AI responds: "To give you the best advice, could you upload a photo of the rash?"
  ↓
User uploads photo
  ↓
AI analyzes photo with user context
  ↓
AI provides personalized advice
```

### **Scenario 2: User Uploads Allergy Photo Directly**

```
User: [Uploads photo of skin rash]
  ↓
AI detects image type (allergy vs food vs medicine)
  ↓
AI analyzes allergy photo
  ↓
AI loads user health profile
  ↓
AI cross-references with user's known allergies/conditions
  ↓
AI provides personalized advice
```

### **Scenario 3: User Mentions Allergy + Has Photo**

```
User: "I have this allergy on my skin" [Uploads photo]
  ↓
AI detects allergy question + photo
  ↓
AI analyzes photo with allergy context
  ↓
AI checks against user profile:
  - Known allergies
  - Previous allergic reactions
  - Medications that might cause allergies
  - Conditions that affect allergies
  ↓
AI provides personalized advice
```

---

## AI Intelligence Requirements

### **1. Proactive Photo Request**

**When AI Should Ask:**
- User mentions allergy symptoms (rash, hives, swelling, itching)
- User asks "What is this allergy?"
- User describes allergic reaction
- User asks about allergy treatment

**AI Prompt Enhancement:**
```typescript
// In AI pharmacist service
const allergyKeywords = [
  'allergy', 'allergic', 'rash', 'hives', 'swelling',
  'itching', 'redness', 'skin reaction', 'allergic reaction'
];

if (detectsAllergyQuestion(userMessage)) {
  // AI should ask for photo
  const response = await gemini.generateContent(`
    User asked: "${userMessage}"
    
    This seems related to allergies or skin reactions.
    Provide helpful initial advice, then PROACTIVELY ask:
    "To give you the most accurate advice, could you upload 
    a photo of the affected area? This will help me better 
    understand the severity and provide personalized recommendations."
    
    Be natural and helpful, not pushy.
  `);
  
  return response;
}
```

---

### **2. Smart Image Type Detection**

**Extend Existing Image Detection:**

```typescript
async function detectImageType(imageBase64: string): Promise<
  'food' | 'medicine' | 'allergy' | 'unknown'
> {
  const prompt = `Analyze this image and determine if it contains:
  - Food/meal items (return "FOOD")
  - Medicine/packaging (return "MEDICINE")
  - Allergy/skin condition/rash/swelling (return "ALLERGY")
  - Neither (return "UNKNOWN")
  
  Respond with ONLY one word: FOOD, MEDICINE, ALLERGY, or UNKNOWN`;
  
  const response = await gemini.generateContent([prompt, {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    }
  }]);
  
  const result = response.response.text().trim().toUpperCase();
  
  if (result.includes('FOOD')) return 'food';
  if (result.includes('MEDICINE')) return 'medicine';
  if (result.includes('ALLERGY')) return 'allergy';
  return 'unknown';
}
```

---

### **3. Allergy Photo Analysis**

**Function:**
```typescript
async function analyzeAllergyPhoto(
  imageBase64: string,
  userId: string,
  language: string,
  userMessage?: string // Optional context from user
): Promise<AllergyAnalysisResult> {
  // STEP 1: Load user health profile
  const healthProfile = await loadUserHealthProfile(userId);
  
  // STEP 2: Ask AI to analyze allergy photo with context
  const prompt = `Analyze this allergy/skin condition photo.

USER HEALTH PROFILE:
- Known Allergies: ${healthProfile.allergies?.join(', ') || 'None specified'}
- Known Conditions: ${healthProfile.known_conditions?.join(', ') || 'None'}
- Medications: ${healthProfile.medications?.join(', ') || 'None'}
- Previous Allergic Reactions: ${formatPreviousReactions(healthProfile)}
${userMessage ? `\nUser Description: "${userMessage}"` : ''}

ANALYSIS TASKS:
1. Identify the type of allergy/skin condition:
   - Rash type (hives, contact dermatitis, eczema, etc.)
   - Severity (mild, moderate, severe)
   - Location and extent
   - Potential causes

2. Cross-reference with user profile:
   - Check if matches known allergies
   - Check if could be medication-related
   - Check if related to known conditions
   - Compare with previous reactions

3. Provide personalized recommendations:
   - Immediate actions
   - Treatment suggestions
   - When to seek medical attention
   - Prevention tips
   - Medication considerations (if applicable)

4. Safety warnings:
   - If severe, recommend immediate medical attention
   - If medication-related, suggest consulting doctor
   - If known allergen, provide specific avoidance advice

Respond in ${language}. Format your response professionally and clearly.
Be empathetic and prioritize user safety.`;

  const response = await gemini.generateContent([prompt, {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    }
  }]);
  
  return {
    success: true,
    message: response.response.text(),
    type: 'allergy',
    severity: extractSeverity(response.response.text()),
    recommendations: extractRecommendations(response.response.text()),
    requiresMedicalAttention: extractMedicalAttention(response.response.text())
  };
}
```

---

### **4. Integration with Existing Image Route**

**Updated `/api/analyze-image/route.ts`:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, language = 'English', allergy, userId, userMessage } = body;
    
    // STEP 1: Detect image type
    const imageType = await detectImageType(imageBase64);
    
    if (imageType === 'allergy') {
      // NEW: Allergy photo analysis
      const allergyResult = await analyzeAllergyPhoto(
        imageBase64,
        userId,
        language,
        userMessage // Optional context
      );
      
      // Save to chat history
      if (userId && allergyResult.success) {
        await saveChatMessage({
          user_id: userId,
          message_type: 'user',
          message_text: userMessage || 'Uploaded allergy photo for analysis',
          image_url: imageBase64,
          // ...
        });
        
        await saveChatMessage({
          user_id: userId,
          message_type: 'ai',
          ai_response: allergyResult.message,
          // Save allergy-specific data
          allergies: allergyResult.recommendations?.join(', '),
          // ...
        });
      }
      
      return NextResponse.json({
        status: 'SUCCESS',
        data: {
          type: 'allergy',
          message: allergyResult.message,
          severity: allergyResult.severity,
          recommendations: allergyResult.recommendations,
          requiresMedicalAttention: allergyResult.requiresMedicalAttention
        }
      });
      
    } else if (imageType === 'food') {
      // Existing food analysis
      return await analyzeFoodPhoto(imageBase64, userId, language);
      
    } else {
      // Existing medicine analysis
      return await geminiAnalyzer.analyzeMedicineImageWithStatus(...);
    }
  } catch (error) {
    // Error handling
  }
}
```

---

### **5. Proactive Photo Request in Text Chat**

**Enhanced AI Pharmacist Service:**

```typescript
// In lib/ai-pharmacist-service.ts

async function aiPharmacist(
  userMessage: string,
  userId?: string,
  language: string = 'English',
  userContext?: UserContext
): Promise<AIResponse> {
  // STEP 1: Load health profile
  const healthProfile = await loadUserHealthProfile(userId);
  
  // STEP 2: Check if allergy-related question
  const isAllergyQuestion = detectsAllergyQuestion(userMessage);
  
  // STEP 3: Generate AI response
  let prompt = `You are a professional AI pharmacist assistant.
  
USER HEALTH PROFILE:
- Known Allergies: ${healthProfile.allergies?.join(', ') || 'None'}
- Known Conditions: ${healthProfile.known_conditions?.join(', ') || 'None'}
- Medications: ${healthProfile.medications?.join(', ') || 'None'}

USER QUESTION: "${userMessage}"
`;

  // STEP 4: If allergy question, instruct AI to ask for photo
  if (isAllergyQuestion) {
    prompt += `
    
SPECIAL INSTRUCTION:
This question is about allergies or skin conditions. After providing 
initial helpful advice, PROACTIVELY and NATURALLY ask the user:
"To give you the most accurate diagnosis and treatment recommendations, 
could you upload a photo of the affected area? This will help me better 
assess the severity and provide personalized advice."

Be helpful and natural, not pushy. If the condition seems severe 
(e.g., difficulty breathing, widespread rash), prioritize immediate 
medical attention advice.
`;
  }
  
  const response = await gemini.generateContent(prompt);
  
  return {
    success: true,
    message: response.response.text(),
    messageType: isAllergyQuestion ? 'allergy_advice' : 'general',
    // If allergy question, flag that photo would be helpful
    photoRequested: isAllergyQuestion
  };
}

function detectsAllergyQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const allergyKeywords = [
    'allergy', 'allergic', 'rash', 'hives', 'swelling',
    'itching', 'itchy', 'redness', 'red', 'skin reaction',
    'allergic reaction', 'dermatitis', 'eczema', 'urticaria',
    'what is this', 'what\'s wrong with my skin', 'skin condition'
  ];
  
  return allergyKeywords.some(keyword => lowerMessage.includes(keyword));
}
```

---

## User Experience Flow

### **Flow 1: Proactive Request**

```
User: "I have a rash on my arm"
  ↓
AI: "A rash on your arm could have several causes. 
    Common causes include allergic reactions, contact 
    dermatitis, or skin irritation.
    
    Initial steps:
    1. Avoid scratching
    2. Wash with mild soap
    3. Apply cool compress
    
    To give you the most accurate diagnosis and treatment 
    recommendations, could you upload a photo of the rash? 
    This will help me better assess the severity and provide 
    personalized advice."
  ↓
User: [Uploads photo]
  ↓
AI: [Analyzes photo with user context]
    "Based on the photo, this appears to be [type]. 
    Given your known allergies to [X], this might be 
    related. Here's what to do..."
```

---

### **Flow 2: Direct Upload**

```
User: [Uploads photo directly]
  ↓
AI detects: imageType = 'allergy'
  ↓
AI: "I see you've uploaded a photo of what appears to be 
    an allergic reaction or skin condition. Let me analyze 
    this with your health profile...
    
    [Analyzes photo]
    
    This appears to be [type]. Based on your known allergies 
    to [X] and your current medications [Y], this might be 
    caused by...
    
    Recommendations:
    1. [Action 1]
    2. [Action 2]
    3. [Action 3]
    
    [If severe] Please seek immediate medical attention if..."
```

---

### **Flow 3: Context + Photo**

```
User: "I have this allergy on my skin" [Uploads photo]
  ↓
AI receives: message + photo
  ↓
AI: "I can see the skin condition in the photo. Based on 
    your description and the visual appearance, combined with 
    your health profile (known allergies to [X]), this 
    appears to be...
    
    [Detailed analysis with context]
    
    Here's my personalized recommendation..."
```

---

## Integration with Existing Features

### **Feature 3: Food Photo Analysis**
- **Extend:** Add allergy detection to image type detection
- **Reuse:** Same orchestration logic (load profile → ask AI → save result)
- **Code:** ~50 additional lines

### **Keyword Extraction**
- **Enhance:** Extract allergy-related keywords
- **Store:** Save known allergies to health profile
- **Code:** Already handles (just need to flag allergy keywords)

### **Health Profile**
- **Enhance:** Track allergy history
- **Store:** Known allergies, previous reactions, allergy patterns
- **Code:** Already have `allergies` field in profile

---

## Database Schema Enhancement

### **Already Exists in `user_health_profiles`:**
```sql
-- Already have:
allergies TEXT[], -- Array of known allergies

-- Can enhance with:
allergy_history JSONB, -- Track previous reactions
allergy_patterns JSONB, -- Pattern data for allergies
```

**No schema changes needed!** ✅

---

## Implementation Plan

### **Phase 4.5: Allergy Photo Analysis** (1-1.5 hours) **[NEW]**

**Step 4.5.1: Allergy Question Detection** (15 min)
- [ ] Create `detectsAllergyQuestion()` function
- [ ] Add allergy keywords list
- [ ] Test detection with various messages

**Step 4.5.2: Proactive Photo Request** (30 min)
- [ ] Enhance AI pharmacist prompt for allergy questions
- [ ] Add instruction to ask for photo naturally
- [ ] Test AI asks for photo when appropriate
- [ ] Test AI doesn't ask if not allergy-related

**Step 4.5.3: Image Type Detection Enhancement** (15 min)
- [ ] Add 'allergy' to image type detection
- [ ] Test detects allergy photos correctly
- [ ] Test distinguishes from food/medicine

**Step 4.5.4: Allergy Photo Analysis Function** (30 min)
- [ ] Create `analyzeAllergyPhoto()` function
- [ ] Load user health profile
- [ ] Create comprehensive prompt with user context
- [ ] Call Gemini API for analysis
- [ ] Parse AI response

**Step 4.5.5: Integration with Image Route** (15 min)
- [ ] Add allergy case to image route
- [ ] Route to allergy analysis when detected
- [ ] Save allergy analysis results
- [ ] Return allergy-specific response

**Step 4.5.6: Testing** (15 min)
- [ ] Test: Allergy question → AI asks for photo
- [ ] Test: Direct allergy photo upload
- [ ] Test: Context + photo upload
- [ ] Test: Allergy analysis with user profile
- [ ] Test: Medical attention warnings

**Total Time:** 1-1.5 hours ✅

---

## Code Volume Estimate

### **Allergy Photo Analysis:**
- **Lines of Code:** ~150 lines
- **Complexity:** Simple orchestration (AI does analysis)
- **Time:** 1-1.5 hours

### **Breakdown:**
- Allergy question detection: ~30 lines
- Proactive photo request: ~50 lines
- Image type detection: ~20 lines (addition)
- Allergy analysis function: ~80 lines
- Integration: ~20 lines
- **Total: ~150 lines**

---

## Testing Checklist

### **Allergy Question Detection:**
- [ ] Test: "I have a rash" → Detected as allergy question
- [ ] Test: "What is this allergy?" → Detected
- [ ] Test: "Skin itching" → Detected
- [ ] Test: "Medicine question" → NOT detected
- [ ] Test: False positives/negatives

### **Proactive Photo Request:**
- [ ] Test: AI asks for photo when allergy question detected
- [ ] Test: AI doesn't ask when not allergy-related
- [ ] Test: AI asks naturally (not pushy)
- [ ] Test: AI prioritizes severe cases (medical attention first)

### **Image Type Detection:**
- [ ] Test: Allergy photo → Detected as 'allergy'
- [ ] Test: Food photo → Detected as 'food' (not allergy)
- [ ] Test: Medicine photo → Detected as 'medicine' (not allergy)
- [ ] Test: Unknown photo → Detected as 'unknown'

### **Allergy Photo Analysis:**
- [ ] Test: Analyzes photo correctly
- [ ] Test: Uses user health profile context
- [ ] Test: Cross-references known allergies
- [ ] Test: Checks medication interactions
- [ ] Test: Provides personalized recommendations
- [ ] Test: Safety warnings for severe cases

### **Integration:**
- [ ] Test: End-to-end flow (question → photo → analysis)
- [ ] Test: Direct photo upload → analysis
- [ ] Test: Context + photo → analysis
- [ ] Test: Saves to chat history
- [ ] Test: Multi-language support

---

## Success Criteria

### **✅ Feature Success:**
1. ✅ AI detects allergy-related questions (>90% accuracy)
2. ✅ AI proactively asks for photo when appropriate
3. ✅ AI analyzes allergy photos correctly (>85% accuracy)
4. ✅ AI uses user health profile for personalized advice
5. ✅ AI provides safety warnings for severe cases
6. ✅ User experience is natural and helpful

---

## Integration with AI Enhancement v3

### **Feature List Update:**

**Add to 10 Workable Features:**
- **Feature 3.5: Allergy Photo Analysis** (NEW)
  - Proactive photo requests
  - Smart allergy photo detection
  - Context-aware allergy analysis
  - Personalized allergy advice

### **Updated Feature Coverage:**

| # | Feature | Status |
|---|---------|--------|
| 1 | Conversational Memory | ✅ |
| 2 | Pattern Recognition | ✅ |
| 3 | Food Photo Analysis | ✅ |
| 3.5 | **Allergy Photo Analysis** | ✅ **NEW** |
| 4 | Follow-up Questions | ✅ |
| 5 | Health Timeline | ✅ |
| 6 | Permission & Consent | ✅ |
| 7 | Timeline Visualization | ✅ |
| 8 | Symptom Logging | ✅ |
| 9 | Contextual Reminders | ✅ |
| 10 | Database Integration | ✅ |

**Total: 10.5 features** (11 if you count Food + Allergy separately)

---

## Benefits

### **✅ Advantages:**
1. **Proactive Intelligence** - AI asks for photos when helpful
2. **Better Diagnosis** - Visual analysis improves accuracy
3. **Personalized Advice** - Uses user's health profile
4. **Safety Priority** - Identifies severe cases
5. **Natural UX** - Seamless integration with chat

### **✅ Time to Implement:**
- **1-1.5 hours** (simple orchestration)
- **~150 lines** of code
- **Reuses existing** image analysis infrastructure

---

## Next Steps

1. ✅ Add to AI Enhancement v3 feature list
2. ✅ Update 2-day implementation plan
3. ✅ Integrate with Phase 4 (Food Photo Analysis)
4. ✅ Test proactive photo requests
5. ✅ Test allergy photo analysis

---

**Status:** ✅ **READY TO ADD TO AI ENHANCEMENT v3**

**Priority:** 🟡 **MEDIUM-HIGH** (Enhances user experience significantly)

**Implementation Time:** 1-1.5 hours ✅

