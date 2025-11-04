# AI Model Capability Analysis & Prompt Enhancement Guide

## Current Model Status

**Currently Using:** `gemini-2.5-pro` ✅
- Model initialized in: `lib/gemini-service.ts` and `lib/ai-pharmacist-service.ts`
- Temperature: 0.1-0.3 (appropriate for medical advice)
- Max tokens: 2048-4096 (sufficient for responses)

---

## Gemini 2.5 Pro Capabilities Assessment

### **✅ What Gemini 2.5 Pro CAN Handle Well:**

1. **Extended Context Window (1M+ tokens)**
   - ✅ Can process large health profiles
   - ✅ Can remember conversation history
   - ✅ Can analyze complex multi-part questions
   - **Assessment:** ✅ **EXCELLENT** - Perfect for health profile integration

2. **Multimodal Processing**
   - ✅ Text analysis
   - ✅ Image analysis (medicine photos, food photos)
   - ✅ Can process both simultaneously
   - **Assessment:** ✅ **EXCELLENT** - Perfect for all our features

3. **Structured Output (JSON)**
   - ✅ Can extract keywords in structured format
   - ✅ Can return patterns as JSON
   - ✅ Can normalize condition names
   - **Assessment:** ✅ **GOOD** - Works well with structured prompts

4. **Multi-language Support**
   - ✅ Supports 10 languages we need
   - ✅ Good translation quality
   - **Assessment:** ✅ **GOOD** - Works for our use case

5. **Medical Knowledge**
   - ✅ Has medical knowledge base
   - ✅ Can provide medical advice
   - ✅ Can identify drug interactions
   - **Assessment:** ✅ **GOOD** - But needs proper prompts for accuracy

6. **Reasoning & Pattern Detection**
   - ✅ Can identify symptom-trigger patterns
   - ✅ Can connect related concepts
   - ✅ Can generate personalized suggestions
   - **Assessment:** ✅ **GOOD** - Needs enhanced prompts for best results

---

## Feature-by-Feature Capability Assessment

### **Feature 1: Conversational Memory System**

**Capability Needed:**
- Extract keywords from messages
- Store in structured format
- Reference in future conversations

**Gemini 2.5 Pro Assessment:** ✅ **EXCELLENT**
- ✅ Large context window can hold full health profile
- ✅ Good at extracting structured information
- ✅ Can reference previous context accurately

**Prompt Enhancement Needed:** ⚠️ **YES**
- Need structured extraction prompts
- Need context inclusion prompts
- Need memory reference prompts

---

### **Feature 2: Pattern Recognition (Smart Inference)**

**Capability Needed:**
- Detect symptom + trigger patterns
- Infer cause-effect relationships
- Generate pattern descriptions

**Gemini 2.5 Pro Assessment:** ✅ **GOOD**
- ✅ Can detect patterns
- ✅ Can reason about relationships
- ⚠️ Needs specific prompts to ensure accuracy

**Prompt Enhancement Needed:** ⚠️ **CRITICAL**
- Need explicit pattern detection prompts
- Need examples of valid patterns
- Need confidence threshold guidance

---

### **Feature 3: Food Photo Analysis with Trigger Warnings**

**Capability Needed:**
- Recognize food ingredients from photos
- Match ingredients to user triggers
- Generate personalized warnings

**Gemini 2.5 Pro Assessment:** ✅ **EXCELLENT**
- ✅ Excellent image recognition
- ✅ Good at ingredient identification
- ✅ Can reason about food-health connections

**Prompt Enhancement Needed:** ⚠️ **YES**
- Need specific food analysis prompts
- Need trigger matching logic prompts
- Need warning generation templates

---

### **Feature 4: Natural Follow-up Questions**

**Capability Needed:**
- Generate relevant questions
- Personalize based on context
- Ask naturally (not form-like)

**Gemini 2.5 Pro Assessment:** ✅ **GOOD**
- ✅ Can generate questions
- ✅ Can personalize based on context
- ⚠️ Needs prompts to ensure naturalness

**Prompt Enhancement Needed:** ⚠️ **YES**
- Need question generation guidelines
- Need personalization templates
- Need naturalness examples

---

### **Feature 5: Health Timeline**

**Capability Needed:**
- Analyze chat history over time
- Identify trends and patterns
- Generate summary text

**Gemini 2.5 Pro Assessment:** ✅ **GOOD**
- ✅ Can analyze historical data
- ✅ Can identify trends
- ⚠️ Needs aggregation prompts

**Prompt Enhancement Needed:** ⚠️ **MODERATE**
- Need timeline analysis prompts
- Need trend identification prompts
- Need summary generation templates

---

### **Feature 6: Permission & Consent**

**Capability Needed:**
- Generate permission prompts
- Natural language requests
- Clear explanation of benefits

**Gemini 2.5 Pro Assessment:** ✅ **GOOD**
- ✅ Can generate natural language
- ✅ Can explain benefits
- ⚠️ Needs examples for consistency

**Prompt Enhancement Needed:** ⚠️ **YES**
- Need permission prompt templates
- Need benefit explanation guidelines
- Need naturalness examples

---

### **Feature 7: Personalized Prompt Suggestions**

**Capability Needed:**
- Analyze user profile
- Generate relevant question suggestions
- Personalize based on conditions/history

**Gemini 2.5 Pro Assessment:** ✅ **GOOD**
- ✅ Can analyze profiles
- ✅ Can generate suggestions
- ⚠️ Needs strong personalization prompts

**Prompt Enhancement Needed:** ⚠️ **CRITICAL**
- Need personalization algorithm prompts
- Need relevance scoring prompts
- Need variety generation prompts

---

### **Feature 8: Personal Details Collection**

**Capability Needed:**
- Ask for personal details naturally
- Validate and normalize data
- Extract from natural conversation

**Gemini 2.5 Pro Assessment:** ✅ **GOOD**
- ✅ Can ask questions naturally
- ✅ Can extract structured data
- ⚠️ Needs extraction prompts

**Prompt Enhancement Needed:** ⚠️ **YES**
- Need data extraction prompts
- Need normalization prompts
- Need validation prompts

---

## Overall Model Assessment

### **✅ Gemini 2.5 Pro is GOOD ENOUGH for all features**

**Strengths:**
- ✅ Large context window (1M+ tokens) - perfect for health profiles
- ✅ Multimodal processing - handles text and images
- ✅ Good reasoning - can detect patterns and relationships
- ✅ Medical knowledge - has good medical understanding
- ✅ Multi-language - supports all our languages

**Limitations (need prompt engineering to overcome):**
- ⚠️ Needs specific prompts for pattern detection accuracy
- ⚠️ Needs structured output prompts for consistency
- ⚠️ Needs personalization prompts for better relevance
- ⚠️ Needs examples/guidelines for natural language generation

**Verdict:** ✅ **YES, Gemini 2.5 Pro is sufficient** - but **prompt engineering is CRITICAL** for best results.

---

## Prompt Enhancement Strategy

### **Current Prompt Issues (Based on Code Review)**

#### **Issue 1: Generic Prompts**
**Current:** Basic prompts without specific guidelines
**Problem:** Responses might be inconsistent or not personalized enough

**Example Current Prompt:**
```
"You are a professional AI pharmacist...
USER QUESTION: "${userMessage}"
...";
```

**Enhanced Prompt Needed:**
```
"You are a professional AI pharmacist with access to user health profile.

USER HEALTH CONTEXT:
- Previous symptoms: ${symptoms}
- Known conditions: ${conditions}
- Patterns: ${patterns}

SPECIFIC INSTRUCTIONS:
1. Always reference user's health history when relevant
2. Use patterns to provide context-aware advice
3. Personalize recommendations based on conditions
4. Ask follow-up questions naturally based on profile

USER QUESTION: "${userMessage}"
...";
```

#### **Issue 2: No Structured Output for Extraction**
**Current:** Free-form extraction might miss keywords
**Problem:** Inconsistent keyword extraction

**Enhanced Prompt Needed:**
```
"Extract health information from this message: "${message}"

REQUIRED OUTPUT FORMAT (JSON):
{
  "symptoms": ["symptom1", "symptom2"],
  "conditions": ["condition1"],
  "medications": ["medication1"],
  "triggers": ["trigger1"],
  "keywords": ["keyword1", "keyword2"]
}

EXTRACTION RULES:
- Only extract actual mentions (not inferred)
- Normalize similar terms ("stomach" = "gastric")
- Use standard medical terminology
- Return empty array if no matches found

Message: "${message}"
```;
```

#### **Issue 3: Pattern Detection Not Explicit**
**Current:** AI might not detect patterns consistently
**Problem:** Missed patterns or false positives

**Enhanced Prompt Needed:**
```
"Analyze this conversation for symptom-trigger patterns.

PATTERN DEFINITION:
- Symptom: Any health complaint (pain, discomfort, etc.)
- Trigger: Cause or associated factor (food, activity, medication)
- Pattern: Clear symptom-trigger relationship

DETECTION RULES:
1. Look for symptom + trigger in same message
2. Example: "ankle pain after beer" = pattern
3. Only detect if relationship is clear
4. Confidence threshold: 80%

CONVERSATION: "${message}"

Return JSON:
{
  "pattern_detected": true/false,
  "symptom": "symptom name",
  "trigger": "trigger name",
  "confidence": 0.0-1.0,
  "reason": "why pattern was detected"
}
```;
```

---

## Enhanced Prompt Templates for Each Feature

### **1. Health Profile-Aware Main Prompt**

```typescript
const enhancedPharmacistPrompt = `You are a professional AI pharmacist assistant with access to user's health profile and conversation history.

**YOUR PERSONALITY:**
- Professional, knowledgeable, and caring
- Always cautious and safety-focused
- References user's health history when relevant
- Provides personalized advice based on profile

**USER HEALTH PROFILE:**
${healthProfile ? `
Previous Symptoms Mentioned: ${healthProfile.symptoms.join(', ') || 'None'}
Known Conditions: ${healthProfile.known_conditions.join(', ') || 'None'}
Current Medications: ${healthProfile.medications.join(', ') || 'None'}
Detected Patterns: ${formatPatterns(healthProfile.patterns)}
Age: ${healthProfile.age || 'Not provided'}
Sex: ${healthProfile.sex || 'Not provided'}
` : 'No health history available yet'}

**CONVERSATION CONTEXT:**
Previous relevant chats: ${getRecentRelevantChats(userId, 3)}

**USER QUESTION:** "${userMessage}"

**RESPONSE GUIDELINES:**
1. **Personalization:**
   - If user mentions symptom they mentioned before, reference it: "I remember you mentioned [symptom] before..."
   - Use patterns to provide context-aware advice
   - Consider known conditions when giving recommendations
   - Age/sex-specific advice when relevant

2. **Pattern Detection:**
   - If you detect a clear symptom-trigger pattern, mention it after your answer
   - Example: "I noticed this pattern: [symptom] after [trigger]. Would you like me to remember this?"

3. **Safety:**
   - Always prioritize safety
   - Check for interactions with known medications
   - Consider known conditions in recommendations
   - Age/sex-specific warnings when needed

4. **Follow-up Questions:**
   - Ask relevant follow-up questions naturally
   - Personalize questions based on profile
   - Don't ask questions if already answered in profile
   - Limit to 2-3 questions per response

5. **Natural Language:**
   - Write naturally, like a real pharmacist
   - Don't sound robotic or formal
   - Use conversational tone
   - Make it personal and caring

**FORMAT YOUR RESPONSE:**
[Main answer with personalized context]
[Follow-up questions if relevant]
[Pattern detection prompt if applicable]`;
```

### **2. Keyword Extraction Prompt**

```typescript
const keywordExtractionPrompt = `Extract health-related information from this message using structured output.

**MESSAGE:** "${message}"

**EXTRACTION RULES:**
1. Symptoms: Any health complaints, pains, discomforts mentioned
2. Conditions: Existing medical conditions or diagnoses
3. Medications: Any medicines or drugs mentioned
4. Triggers: Foods, activities, or factors that cause symptoms
5. Keywords: General health-related terms

**NORMALIZATION RULES:**
- "stomach" = "gastric" = "stomach pain"
- "high BP" = "hypertension" = "high blood pressure"
- "high sugar" = "diabetes" = "high blood sugar"
- "gout" = "high uric acid" (if context suggests)

**REQUIRED OUTPUT (JSON):**
{
  "symptoms": ["symptom1", "symptom2"],
  "conditions": ["condition1"],
  "medications": ["medication1"],
  "triggers": ["trigger1", "trigger2"],
  "keywords": ["keyword1"],
  "normalized": true
}

**IMPORTANT:**
- Only extract what's actually mentioned (not inferred)
- Return empty arrays if no matches
- Normalize terms to standard medical terminology
- Be conservative (don't over-extract)`;
```

### **3. Pattern Detection Prompt**

```typescript
const patternDetectionPrompt = `Analyze this conversation for symptom-trigger patterns.

**MESSAGE:** "${message}"
**USER HISTORY:** ${JSON.stringify(recentChats)}

**PATTERN DEFINITION:**
A pattern is a clear relationship between:
- Symptom: Health complaint (pain, discomfort, etc.)
- Trigger: Cause or associated factor (food, activity, medication, time)

**VALID PATTERN EXAMPLES:**
✅ "ankle pain after drinking beer" → pattern: ankle pain + alcohol
✅ "gastric pain after spicy food" → pattern: gastric pain + spicy food
✅ "headache when I skip meals" → pattern: headache + skipping meals

**INVALID (Not Patterns):**
❌ "I have pain" → No trigger mentioned
❌ "I take medicine" → Not a pattern
❌ "I feel better after rest" → This is treatment, not pattern

**DETECTION RULES:**
1. Both symptom AND trigger must be clearly mentioned
2. Relationship must be clear (causal or temporal)
3. Confidence must be > 0.7 to count as pattern
4. Don't detect if already exists in user's saved patterns

**OUTPUT (JSON):**
{
  "pattern_detected": true/false,
  "symptom": "normalized symptom name",
  "trigger": "normalized trigger name",
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "frequency": 1
}`;
```

### **4. Personalized Prompt Suggestion Prompt**

```typescript
const personalizedPromptPrompt = `Generate 3-5 personalized prompt suggestions for this user.

**USER PROFILE:**
${JSON.stringify(healthProfile)}

**PROMPT GENERATION RULES:**
1. **Relevance:** Prompts must be relevant to user's conditions/history
2. **Helpfulness:** Prompts should be actionable and useful
3. **Variety:** Different types of questions (interaction, dosage, safety, etc.)
4. **Personalization:** Reference user's specific conditions/patterns
5. **Natural Language:** Questions should sound natural, not robotic

**GENERATION STRATEGY:**
- If user has high BP: Suggest BP-related medicine interaction questions
- If user has gastric issues: Suggest stomach-safe medicine questions
- If user has patterns: Suggest questions related to pattern triggers
- If user is elderly (age > 65): Suggest age-appropriate questions
- If user is female: Suggest pregnancy-related questions (if relevant)

**EXAMPLES:**
For user with high BP:
- "Can I take [medicine] with my blood pressure medication?"
- "What medicines are safe for people with high blood pressure?"

For user with gastric issues:
- "Is this medicine safe for my stomach?"
- "Can I take painkillers if I have gastric problems?"

**OUTPUT (JSON Array):**
[
  "Personalized question 1",
  "Personalized question 2",
  "Personalized question 3"
]`;
```

### **5. Personal Details Extraction Prompt**

```typescript
const personalDetailsPrompt = `Extract personal details from this conversation naturally.

**MESSAGE:** "${message}"

**WHAT TO EXTRACT:**
1. Age: Any mention of age (e.g., "I'm 35", "I'm in my 30s")
2. Sex: Any mention of gender (e.g., "I'm a woman", "male", "female")
3. Known Conditions: Existing medical conditions
   - Examples: "I have high blood pressure", "I'm diabetic", "I have gastric issues"
4. Past History: Previous medical events (surgeries, illnesses, etc.)
5. Family History: Family medical conditions

**EXTRACTION RULES:**
- Only extract if explicitly mentioned (don't infer)
- Normalize condition names (use standard medical terms)
- Validate age (must be reasonable: 1-120)
- Use standard values for sex: "male", "female", "other"

**OUTPUT (JSON):**
{
  "age": 35 or null,
  "sex": "male" | "female" | "other" | null,
  "known_conditions": ["condition1", "condition2"],
  "past_history": "free text or null",
  "family_history": "free text or null",
  "confidence": 0.0-1.0
}`;
```

---

## Prompt Testing & Iteration Strategy

### **Phase 1: Baseline Testing**
1. Test current prompts with sample questions
2. Measure accuracy, relevance, personalization
3. Identify weaknesses

### **Phase 2: Enhanced Prompt Testing**
1. Test enhanced prompts with same questions
2. Compare results (before/after)
3. Measure improvement

### **Phase 3: Iterative Refinement**
1. Collect user feedback
2. Monitor prompt performance
3. Refine based on real usage

### **Phase 4: A/B Testing**
1. Test different prompt variations
2. Measure user engagement
3. Choose best performing prompts

---

## Key Prompt Engineering Principles

### **1. Be Specific**
❌ "Extract health information"
✅ "Extract symptoms, conditions, medications, and triggers in JSON format"

### **2. Provide Examples**
❌ "Detect patterns"
✅ "Detect patterns like 'ankle pain after beer' = symptom: ankle pain, trigger: alcohol"

### **3. Use Structured Output**
❌ "Tell me about the medicine"
✅ "Provide: medicine name, dosage, side effects, interactions, safety notes (JSON format)"

### **4. Include Context**
❌ "Answer the question"
✅ "Answer considering user's history: [conditions], [patterns], [age]"

### **5. Set Boundaries**
❌ "Be helpful"
✅ "Be helpful but conservative. Don't diagnose. Always recommend consulting healthcare professionals."

---

## Recommendations

### **✅ Gemini 2.5 Pro is SUFFICIENT**
- Model has all capabilities needed
- Large context window perfect for health profiles
- Good reasoning for pattern detection
- Multimodal for images

### **⚠️ BUT Prompt Engineering is CRITICAL**
- Current prompts need enhancement
- Need structured output prompts
- Need personalization guidelines
- Need examples and templates

### **📋 Action Items:**
1. ✅ Use enhanced prompts from this document
2. ✅ Test each prompt with sample data
3. ✅ Iterate based on results
4. ✅ Monitor performance and refine
5. ✅ A/B test different prompt variations

---

**Status:** 🔴 **READY FOR PROMPT ENHANCEMENT**

**Next Steps:**
1. Review enhanced prompt templates
2. Test with sample questions
3. Refine based on results
4. Deploy enhanced prompts
5. Monitor and iterate

