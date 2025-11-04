# Complete Implementation Phases Checklist - AI Enhancement v3

## Pre-Implementation Review
**Status:** 🔴 **READY FOR REVIEW BEFORE STARTING**

This document lists ALL phases, integrations, dependencies, and deliverables before we begin implementation.

---

## **Complete Feature List (11 Features + 2 Bonus)**

### **Core Features:**
1. ✅ Conversational Memory System
2. ✅ Pattern Recognition
3. ✅ Food Photo Analysis
4. ✅ **Allergy Photo Analysis** (NEW)
5. ✅ Natural Follow-up Questions
6. ✅ Health Timeline (Text Summary)
7. ✅ Permission & Consent
8. ✅ Health Timeline Visualization
9. ✅ Symptom Logging
10. ✅ Smart Contextual Reminders
11. ✅ Database Integration with Context

### **Bonus Features:**
- ✅ Personal Details Collection
- ✅ Personalized Prompt Suggestions

---

## **DAY 1: Foundation & Core Features** (7-8 hours)

---

### **PHASE 1: Database Setup & Basic Memory** (3.5-4 hours)

#### **Step 1.1: Create Database Table** (30 min)
**Deliverable:** `database/CREATE_USER_HEALTH_PROFILES.sql`

**Tasks:**
- [ ] Create `user_health_profiles` table with all columns:
  - `id`, `user_id` (references profiles.id)
  - Personal Info: `age`, `sex`, `date_of_birth`
  - Medical History: `known_conditions[]`, `past_medical_history`, `family_history`
  - Health Keywords: `health_keywords[]`, `symptoms[]`, `conditions[]`, `medications[]`, `triggers[]`
  - Patterns: `patterns` (JSONB)
  - Consent: `pattern_tracking_consent`, `consent_given_at`
  - Status: `personal_details_collected`, `details_collection_date`
  - Metadata: `last_extraction_at`, `extraction_count`, `total_chats_analyzed`
  - Timestamps: `created_at`, `updated_at`
- [ ] Create indexes:
  - GIN index on arrays (symptoms, conditions, medications, triggers)
  - GIN index on JSONB (patterns)
  - Index on `user_id`
  - Index on `known_conditions`
- [ ] Set up RLS policies:
  - Users can only access their own health profile
  - Service role can access all profiles
- [ ] Test table creation on dev database
- [ ] Verify RLS policies work correctly

**Integration Points:**
- ✅ Database: Supabase PostgreSQL
- ✅ References: `profiles` table (existing)
- ✅ Used By: All subsequent phases

**Dependencies:**
- ✅ None (starts the foundation)

---

#### **Step 1.2: Create Health Profile Service** (1-2 hours)
**Deliverable:** `lib/health-profile-service.ts`

**Tasks:**
- [ ] Create service file
- [ ] Implement `loadUserHealthProfile(userId: string)`
  - Query `user_health_profiles` table
  - Return profile or null if not exists
  - Handle errors gracefully
- [ ] Implement `initializeHealthProfile(userId: string)`
  - Create new profile record
  - Set default values
  - Return created profile
- [ ] Implement `updateHealthProfile(userId: string, data: Partial<HealthProfile>)`
  - Update existing profile
  - Merge arrays (deduplicate)
  - Update `updated_at` timestamp
- [ ] Add error handling and fallbacks
- [ ] Add TypeScript types/interfaces
- [ ] Test service functions

**Integration Points:**
- ✅ Database: Uses Supabase client
- ✅ Used By: All phases that need profile data

**Dependencies:**
- ✅ Step 1.1 (database table must exist)

---

#### **Step 1.3: Basic Keyword Extraction & Symptom Logging** (1 hour)
**Deliverable:** `extractHealthKeywords()` function + symptom logging support

**Tasks:**
- [ ] Create keyword extraction function
- [ ] Use Gemini to extract:
  - Symptoms: `["symptom1", "symptom2"]`
  - Conditions: `["condition1", "condition2"]`
  - Medications: `["medication1", "medication2"]`
  - Triggers: `["trigger1", "trigger2"]`
- [ ] Return structured JSON format
- [ ] **NEW:** Detect explicit symptom logging
  - Pattern: "Logging symptoms: ..." or "Log symptoms: ..."
  - Extract symptoms from logging messages
  - Flag as explicit logging
- [ ] Normalize keywords (lowercase, trim)
- [ ] Handle extraction errors gracefully
- [ ] Test extraction with sample messages
- [ ] Test symptom logging detection

**Integration Points:**
- ✅ AI: Gemini 2.5 Pro API
- ✅ Service: Calls `health-profile-service` for profile loading
- ✅ Used By: Phase 1.4 (AI pharmacist integration)

**Dependencies:**
- ✅ Step 1.2 (health profile service must exist)

---

#### **Step 1.4: Integrate with AI Pharmacist** (1 hour)
**Deliverable:** Updated `lib/ai-pharmacist-service.ts`

**Tasks:**
- [ ] Modify `lib/ai-pharmacist-service.ts`
- [ ] Load health profile before AI response:
  - Call `loadUserHealthProfile(userId)`
  - Handle case when profile doesn't exist (first time user)
- [ ] Add profile context to AI prompts:
  - Previous symptoms
  - Known conditions
  - Medications
  - Triggers
  - Patterns (if any)
- [ ] Extract keywords in background after response:
  - Don't block AI response
  - Call `extractHealthKeywords()` after response sent
  - Save extracted data asynchronously
- [ ] Save extracted data to database:
  - Call `updateHealthProfile()` with extracted keywords
  - Merge with existing data (deduplicate)
- [ ] Test end-to-end flow:
  - Message → Extract → Save → Next message loads profile
  - Verify AI references history in next conversation

**Integration Points:**
- ✅ Service: Uses `health-profile-service.ts`
- ✅ AI: Uses Gemini 2.5 Pro
- ✅ Database: Saves to `user_health_profiles`
- ✅ API: Updated `/api/ai-pharmacist/route.ts` (if needed)

**Dependencies:**
- ✅ Step 1.2 (health profile service)
- ✅ Step 1.3 (keyword extraction function)

---

#### **Phase 1 Testing** (30 min)
**Deliverables:** Phase 1 verified and working

**Test Cases:**
- [ ] Test: Send message → Check database → Verify data saved
- [ ] Test: Send second message → Verify profile loaded → Verify AI references history
- [ ] Test error handling:
  - Profile load fails → AI still responds (graceful fallback)
  - Extraction fails → AI still responds (graceful fallback)
- [ ] Verify performance:
  - Profile load time < 100ms
  - Keyword extraction (background, doesn't block)
- [ ] Test symptom logging:
  - "Logging symptoms: gastric pain, headache" → Extracted correctly

**Success Criteria:**
- ✅ Health profile table created and working
- ✅ Keywords extracted and saved
- ✅ Symptom logging detected and saved (Feature 8)
- ✅ Next conversation loads profile
- ✅ AI references previous conversations

---

### **PHASE 2: Pattern Detection & Permission System** (3-4 hours)

#### **Step 2.1: Pattern Detection Logic** (1.5 hours)
**Deliverable:** `detectPattern()` function

**Tasks:**
- [ ] Create pattern detection function
- [ ] Detect symptom + trigger combinations:
  - Example: "ankle pain" + "alcohol" = pattern
  - Check current message for symptoms and triggers
  - Cross-reference with profile history
- [ ] Calculate pattern confidence:
  - How many times pattern appeared
  - Consistency of pattern
  - Confidence score (0-1)
- [ ] Check if pattern already exists:
  - Query existing patterns from profile
  - Compare with new pattern
  - Update frequency if exists, create new if not
- [ ] Store pattern format:
  ```json
  {
    "symptom": "ankle pain",
    "trigger": "alcohol",
    "frequency": 2,
    "confidence": 0.85,
    "confirmed": false,
    "created_at": "2024-01-15"
  }
  ```
- [ ] Test pattern detection with various messages
- [ ] Test pattern matching accuracy

**Integration Points:**
- ✅ Service: Uses `health-profile-service.ts` to load profile
- ✅ Database: Saves patterns to `user_health_profiles.patterns` (JSONB)
- ✅ Used By: Step 2.3 (pattern saving), Step 2.4 (pattern usage)

**Dependencies:**
- ✅ Phase 1 complete (need profile data)

---

#### **Step 2.2: Permission Prompt UI** (1 hour)
**Deliverable:** Permission prompt in chat UI

**Tasks:**
- [ ] Create permission prompt component (if needed)
  - Check if existing UI supports this
  - May be just text in AI response
- [ ] Add permission prompt to AI response:
  - Appears AFTER main answer (not interruptive)
  - Natural language: "I noticed this pattern... Would you like me to remember?"
- [ ] Add buttons: `[Yes, remember]` `[No thanks]` `[Maybe later]`
  - Or handle via text response (user types yes/no)
- [ ] Style permission prompt (non-intrusive):
  - Subtle styling
  - Doesn't block conversation flow
- [ ] Test UI on mobile and desktop
- [ ] Test accessibility (keyboard navigation, screen readers)

**Integration Points:**
- ✅ Frontend: Chat UI component
- ✅ API: Sends user consent to backend
- ✅ Used By: Step 2.3 (saves pattern on consent)

**Dependencies:**
- ✅ Step 2.1 (pattern detection must work)

---

#### **Step 2.3: Pattern Saving** (1 hour)
**Deliverable:** Pattern saving functionality

**Tasks:**
- [ ] Implement `savePattern()` function
- [ ] Save pattern when user consents:
  - Extract pattern from message
  - Get user consent (from UI or message)
  - Save to database
- [ ] Update pattern frequency if pattern exists:
  - Check if similar pattern already exists
  - Increment frequency
  - Update `last_seen_at`
- [ ] Create new pattern if doesn't exist:
  - Add to patterns array
  - Set frequency = 1
  - Set confirmed = true (if user explicitly consents)
- [ ] Update pattern tracking consent status:
  - Set `pattern_tracking_consent = true`
  - Set `consent_given_at = NOW()`
- [ ] Handle consent withdrawal:
  - User can say "don't remember" later
  - Set `consent_withdrawn_at = NOW()`
- [ ] Test pattern saving

**Integration Points:**
- ✅ Database: Updates `user_health_profiles.patterns` (JSONB)
- ✅ API: Receives consent from frontend
- ✅ Service: Uses `health-profile-service.ts`
- ✅ Used By: Step 2.4 (patterns used in AI responses)

**Dependencies:**
- ✅ Step 2.1 (pattern detection)
- ✅ Step 2.2 (permission UI)

---

#### **Step 2.4: Pattern Usage in AI** (30 min)
**Deliverable:** Pattern-aware AI responses

**Tasks:**
- [ ] Update AI prompts to use saved patterns:
  - Load user profile (get patterns)
  - Include patterns in AI context
  - Example: "User has pattern: ankle pain after alcohol (2 times)"
- [ ] Reference patterns in responses:
  - "I remember you mentioned ankle pain after alcohol before..."
  - Use patterns to provide context-aware advice
- [ ] Test: Save pattern → Next chat uses pattern
- [ ] Test: Pattern appears in AI context correctly

**Integration Points:**
- ✅ AI: Gemini prompts include pattern context
- ✅ Service: Uses `health-profile-service.ts` to load patterns
- ✅ Used By: All future AI responses

**Dependencies:**
- ✅ Step 2.3 (patterns must be saved)

---

#### **Phase 2 Testing** (30 min)
**Deliverables:** Phase 2 verified and working

**Test Cases:**
- [ ] Test: Detect pattern → Show permission → User clicks "Yes" → Pattern saved
- [ ] Test: Next conversation → AI references pattern
- [ ] Test: Pattern frequency updates correctly
- [ ] Test: Permission state persists
- [ ] Test: Multiple patterns saved correctly

**Success Criteria:**
- ✅ Patterns detected correctly
- ✅ Permission prompt appears
- ✅ Patterns saved after consent
- ✅ AI uses patterns in responses

---

## **DAY 2: Advanced Features & Photo Analysis** (11-13.5 hours)

---

### **PHASE 3: Personal Details & Follow-up Questions** (3.5-4 hours)

#### **Step 3.1: Personal Details Extraction** (1 hour)
**Deliverable:** `extractPersonalDetails()` function

**Tasks:**
- [ ] Create personal details extraction function
- [ ] Extract using Gemini:
  - Age: "I'm 30" → 30
  - Sex: "male", "female", "other"
  - Known conditions: "high blood pressure", "diabetes", etc.
  - Medical history: Past medical events
  - Family history: Family medical conditions
- [ ] Normalize condition names:
  - "high BP" → "high blood pressure"
  - "hypertension" → "high blood pressure"
  - Use `normalize_condition_name()` database function
- [ ] Validate extracted data:
  - Age: 1-120 range
  - Sex: Limited to valid options
  - Conditions: Check against common conditions list
- [ ] Handle partial extraction:
  - User might only mention age, not sex
  - User might only mention one condition
- [ ] Test extraction with various messages

**Integration Points:**
- ✅ AI: Gemini 2.5 Pro
- ✅ Database: Uses `normalize_condition_name()` function
- ✅ Used By: Step 3.3 (save personal details)

**Dependencies:**
- ✅ Phase 1 complete (need profile service)

---

#### **Step 3.2: Natural Question Flow & Follow-up Questions** (1.5 hours)
**Deliverable:** Natural personal details collection + follow-up questions

**Tasks:**
- [ ] Update AI prompts to ask for personal details naturally:
  - Only ask when relevant to current question
  - Example: "To give you the best advice, may I know your age?"
  - Don't ask all at once (spread across conversations)
- [ ] Implement natural follow-up questions (Feature 4):
  - AI asks relevant questions during conversation
  - "To give you the best advice, I need to understand:"
  - "1. When did it start?"
  - "2. What did you eat today?"
  - "3. Pain level 1-10?"
- [ ] Gather context naturally (not form-like):
  - Don't ask like a questionnaire
  - Integrate questions into conversation flow
- [ ] Allow users to skip questions:
  - User can say "I don't know" or "skip"
  - AI moves on without pressing
- [ ] Track what's already collected:
  - Don't repeat questions
  - Check `personal_details_collected` flag
  - Check `details_completeness` JSONB
- [ ] Test question flow (natural, not form-like)
- [ ] Test follow-up questions work correctly

**Integration Points:**
- ✅ AI: Enhanced Gemini prompts
- ✅ Service: Uses `health-profile-service.ts` to check what's collected
- ✅ Used By: Step 3.3 (save collected details)

**Dependencies:**
- ✅ Step 3.1 (extraction function)

---

#### **Step 3.3: Save Personal Details** (30 min)
**Deliverable:** Personal details saving

**Tasks:**
- [ ] Implement `updatePersonalDetails()` function
- [ ] Save to database:
  - Age, sex, known conditions
  - Past medical history (text)
  - Family history (text)
- [ ] Update `personal_details_collected` flag:
  - Set to `true` when any details collected
  - Update `details_collection_date`
- [ ] Track completeness:
  - Update `details_completeness` JSONB:
    ```json
    {
      "age": true,
      "sex": true,
      "known_conditions": true,
      "past_history": false,
      "family_history": false
    }
    ```
- [ ] Test data saving
- [ ] Test completeness tracking

**Integration Points:**
- ✅ Database: Updates `user_health_profiles` table
- ✅ Service: Uses `health-profile-service.ts`
- ✅ Used By: Step 3.4 (use in AI responses)

**Dependencies:**
- ✅ Step 3.1 (extraction)
- ✅ Step 3.2 (question flow)

---

#### **Step 3.4: Use Personal Details in AI** (30 min)
**Deliverable:** Personal details in AI responses

**Tasks:**
- [ ] Update AI prompts to include personal details:
  - Age: For age-specific advice
  - Sex: For sex-specific recommendations
  - Known conditions: For safety warnings
  - Example: "User is 30, male, has high blood pressure..."
- [ ] Use age/sex for personalized advice:
  - Different advice for children vs adults
  - Different advice for males vs females
- [ ] Use known conditions for safety warnings:
  - "Given your high blood pressure, avoid this medicine..."
  - "Given your diabetes, monitor blood sugar..."
- [ ] Test: Collect details → Use in AI response
- [ ] Test: Personalization improves advice quality

**Integration Points:**
- ✅ AI: Enhanced Gemini prompts with personal context
- ✅ Service: Loads personal details from profile
- ✅ Database Integration: Uses for medicine interactions (Feature 10)

**Dependencies:**
- ✅ Step 3.3 (details must be saved)

---

#### **Phase 3 Testing** (30 min)
**Deliverables:** Phase 3 verified and working

**Test Cases:**
- [ ] Test: AI asks for age naturally → User provides → Saved
- [ ] Test: AI asks for known conditions → User provides → Saved
- [ ] Test: Next conversation uses collected details
- [ ] Test: Condition normalization works ("high BP" → "high blood pressure")
- [ ] Test: Follow-up questions work naturally
- [ ] Test: AI doesn't repeat already collected information

**Success Criteria:**
- ✅ Personal details collected naturally
- ✅ Data saved correctly
- ✅ AI uses personal details in responses
- ✅ Condition names normalized
- ✅ Natural follow-up questions work (Feature 4)
- ✅ AI gathers context naturally (not form-like)

---

### **PHASE 4: Food Photo Analysis** (1-1.5 hours)

#### **Step 4.1: Image Type Detection** (20 min)
**Deliverable:** Enhanced image type detection

**Tasks:**
- [ ] Extend existing image detection function
- [ ] Add detection for 'food' type:
  - Use Gemini to analyze image
  - Prompt: "Is this food? Return FOOD, MEDICINE, or UNKNOWN"
- [ ] Test detects food photos correctly
- [ ] Test distinguishes from medicine photos
- [ ] Test handles unknown images gracefully

**Integration Points:**
- ✅ AI: Gemini 2.5 Pro for image analysis
- ✅ Used By: Step 4.2 (food analysis), Step 4.5 (allergy analysis)

**Dependencies:**
- ✅ None (standalone enhancement)

---

#### **Step 4.2: Food Analysis Function** (40 min)
**Deliverable:** Food photo analysis with trigger warnings

**Tasks:**
- [ ] Create `analyzeFoodPhoto()` function
- [ ] Load user health profile:
  - Get triggers and patterns
  - Get known conditions
- [ ] Create AI prompt with user context:
  - "Analyze this food image. User's triggers: spicy food, dairy..."
  - "Check if food contains triggers. If yes, warn and suggest alternatives."
- [ ] Call Gemini API for analysis:
  - AI identifies food
  - AI extracts ingredients
  - AI matches triggers
  - AI generates warnings
  - AI suggests alternatives
- [ ] Parse AI response:
  - Extract warnings (if any)
  - Extract alternatives (if any)
  - Format for display
- [ ] Return structured result

**Integration Points:**
- ✅ Service: Uses `health-profile-service.ts` to load profile
- ✅ AI: Gemini 2.5 Pro does heavy lifting
- ✅ Database: Saves food analysis results to chat history
- ✅ Used By: Step 4.3 (integration)

**Dependencies:**
- ✅ Step 4.1 (image type detection)
- ✅ Phase 1-2 complete (need profile with triggers/patterns)

---

#### **Step 4.3: Integration with Image Route** (20 min)
**Deliverable:** Food analysis integrated

**Tasks:**
- [ ] Update `/api/analyze-image/route.ts`
- [ ] Add food case:
  ```typescript
  if (imageType === 'food') {
    return await analyzeFoodPhoto(imageBase64, userId, language);
  }
  ```
- [ ] Handle food analysis response:
  - Save to chat history
  - Return food-specific data structure
- [ ] Test food photo upload → Analysis → Response
- [ ] Test error handling

**Integration Points:**
- ✅ API: Existing image upload endpoint
- ✅ Frontend: Uses existing camera/image upload UI
- ✅ Database: Saves to chat history

**Dependencies:**
- ✅ Step 4.2 (food analysis function)

---

#### **Phase 4 Testing** (15 min)
**Deliverables:** Phase 4 verified and working

**Test Cases:**
- [ ] Test: Upload food photo → Detected as food
- [ ] Test: Food analysis extracts ingredients correctly
- [ ] Test: Trigger matching works (spicy food → gastric trigger)
- [ ] Test: Warning message appears correctly
- [ ] Test: Safer alternatives suggested
- [ ] Test: Works on mobile (camera function)
- [ ] Test: Works on desktop (file upload)

**Success Criteria:**
- ✅ Food photos detected correctly
- ✅ Ingredients extracted accurately
- ✅ Triggers matched with user profile
- ✅ Warnings generated appropriately
- ✅ Alternatives suggested helpfully

---

### **PHASE 4.5: Allergy Photo Analysis** (1-1.5 hours) **[NEW]**

#### **Step 4.5.1: Allergy Question Detection** (15 min)
**Deliverable:** Allergy question detection function

**Tasks:**
- [ ] Create `detectsAllergyQuestion()` function
- [ ] Add allergy keywords list:
  - 'allergy', 'allergic', 'rash', 'hives', 'swelling', 'itching', etc.
- [ ] Test detection with various messages:
  - "I have a rash" → Detected
  - "Allergic reaction" → Detected
  - "Medicine question" → NOT detected
- [ ] Test false positives/negatives

**Integration Points:**
- ✅ Used By: Step 4.5.2 (proactive photo request)

**Dependencies:**
- ✅ None (standalone function)

---

#### **Step 4.5.2: Proactive Photo Request** (30 min)
**Deliverable:** AI asks for photos naturally

**Tasks:**
- [ ] Enhance AI pharmacist prompt for allergy questions:
  - Detect allergy question
  - Add instruction: "After providing initial advice, PROACTIVELY ask for photo"
- [ ] Format natural request:
  - "To give you the most accurate diagnosis, could you upload a photo?"
  - Not pushy, helpful tone
- [ ] Prioritize safety:
  - If severe case mentioned, medical attention advice first
  - Then ask for photo if still relevant
- [ ] Test AI asks for photo when appropriate
- [ ] Test AI doesn't ask when not allergy-related

**Integration Points:**
- ✅ AI: Enhanced Gemini prompts
- ✅ Used By: User experience flow

**Dependencies:**
- ✅ Step 4.5.1 (allergy detection)

---

#### **Step 4.5.3: Image Type Detection Enhancement** (15 min)
**Deliverable:** 'allergy' added to image detection

**Tasks:**
- [ ] Update image type detection function
- [ ] Add 'allergy' to return type:
  - `'food' | 'medicine' | 'allergy' | 'unknown'`
- [ ] Update detection prompt:
  - "Is this allergy/skin condition? Return ALLERGY if yes"
- [ ] Test detects allergy photos correctly
- [ ] Test distinguishes from food/medicine

**Integration Points:**
- ✅ Reuses: Step 4.1 (image detection infrastructure)
- ✅ Used By: Step 4.5.4 (allergy analysis)

**Dependencies:**
- ✅ Step 4.1 (base image detection)

---

#### **Step 4.5.4: Allergy Photo Analysis Function** (30 min)
**Deliverable:** Allergy photo analysis with user context

**Tasks:**
- [ ] Create `analyzeAllergyPhoto()` function
- [ ] Load user health profile:
  - Known allergies
  - Current medications
  - Known conditions
  - Previous allergic reactions (from patterns)
- [ ] Create comprehensive AI prompt:
  - "Analyze this allergy photo. User's known allergies: X, Y..."
  - "Check if matches known allergies"
  - "Check if medication-related"
  - "Provide personalized recommendations"
  - "Warn if severe"
- [ ] Call Gemini API for analysis
- [ ] Parse AI response:
  - Extract severity
  - Extract recommendations
  - Extract medical attention warnings
- [ ] Return structured result

**Integration Points:**
- ✅ Service: Uses `health-profile-service.ts`
- ✅ AI: Gemini 2.5 Pro does analysis
- ✅ Database: Saves to chat history

**Dependencies:**
- ✅ Step 4.5.3 (image type detection)
- ✅ Phase 1-3 complete (need profile data)

---

#### **Step 4.5.5: Integration with Image Route** (15 min)
**Deliverable:** Allergy analysis integrated

**Tasks:**
- [ ] Update `/api/analyze-image/route.ts`
- [ ] Add allergy case:
  ```typescript
  if (imageType === 'allergy') {
    return await analyzeAllergyPhoto(imageBase64, userId, language, userMessage);
  }
  ```
- [ ] Handle allergy analysis response
- [ ] Save to chat history
- [ ] Test allergy photo upload → Analysis

**Integration Points:**
- ✅ API: Existing image route
- ✅ Frontend: Existing image upload UI

**Dependencies:**
- ✅ Step 4.5.4 (allergy analysis function)

---

#### **Phase 4.5 Testing** (15 min)
**Deliverables:** Phase 4.5 verified and working

**Test Cases:**
- [ ] Test: Allergy question → AI asks for photo
- [ ] Test: Direct allergy photo upload → Analysis
- [ ] Test: Context + photo → Analysis
- [ ] Test: Allergy analysis uses user profile
- [ ] Test: Safety warnings for severe cases

**Success Criteria:**
- ✅ Allergy questions detected correctly
- ✅ AI asks for photos proactively
- ✅ Allergy photos analyzed accurately
- ✅ User profile context used
- ✅ Safety warnings provided

---

### **PHASE 5: Timeline Visualization** (1.5-2 hours)

#### **Step 5.1: Chart Library Setup** (15 min)
**Deliverable:** Recharts installed and configured

**Tasks:**
- [ ] Install Recharts library:
  ```bash
  npm install recharts
  ```
- [ ] Verify installation
- [ ] Test basic chart component works

**Integration Points:**
- ✅ Frontend: React component library
- ✅ Used By: Step 5.3 (chart component)

**Dependencies:**
- ✅ None (library installation)

---

#### **Step 5.2: Data Aggregation** (45 min)
**Deliverable:** Timeline data from database

**Tasks:**
- [ ] Create `generateTimelineData()` function
- [ ] Query chat history:
  - Get all user messages (with timestamps)
  - Filter for health-related messages
- [ ] Aggregate symptom frequency by week/month:
  - Group by time period
  - Count symptom mentions
- [ ] Aggregate trigger frequency:
  - Count how many times each trigger mentioned
- [ ] Extract patterns timeline:
  - When patterns were detected
  - Pattern frequency over time
- [ ] Return structured data for chart

**Integration Points:**
- ✅ Database: Queries `chat_history` table
- ✅ Service: Uses `health-profile-service.ts` for pattern data
- ✅ Used By: Step 5.3 (chart component)

**Dependencies:**
- ✅ Phase 1-2 complete (need chat history and patterns)

---

#### **Step 5.3: Chart Component** (1 hour)
**Deliverable:** `components/HealthTimelineChart.tsx`

**Tasks:**
- [ ] Create React component
- [ ] Configure Recharts:
  - LineChart or BarChart
  - X-axis: Time periods
  - Y-axis: Frequency counts
  - Multiple lines for different symptoms
- [ ] Style chart:
  - Responsive design
  - Mobile-friendly
  - Accessible colors
- [ ] Add tooltips and legends
- [ ] Test chart renders correctly
- [ ] Test with sample data

**Integration Points:**
- ✅ Frontend: React component
- ✅ Used By: Step 5.5 (chat UI integration)

**Dependencies:**
- ✅ Step 5.1 (Recharts installed)
- ✅ Step 5.2 (data aggregation)

---

#### **Step 5.4: Timeline Request Detection** (15 min)
**Deliverable:** Timeline request detection

**Tasks:**
- [ ] Create `isTimelineRequest()` function
- [ ] Add timeline keywords:
  - 'show timeline', 'health timeline', 'my health summary', etc.
- [ ] Test detects timeline requests correctly
- [ ] Test doesn't trigger on unrelated messages

**Integration Points:**
- ✅ Used By: Step 5.5 (trigger chart display)

**Dependencies:**
- ✅ None (simple keyword check)

---

#### **Step 5.5: Integration with Chat UI** (30 min)
**Deliverable:** Timeline in chat interface

**Tasks:**
- [ ] Update message display component
- [ ] Check for timeline message type
- [ ] Render chart component when timeline requested
- [ ] Handle chart display:
  - Show in chat message
  - Responsive sizing
  - Mobile optimization
- [ ] Test timeline displays correctly
- [ ] Test on mobile and desktop

**Integration Points:**
- ✅ Frontend: Chat UI component
- ✅ Component: HealthTimelineChart component

**Dependencies:**
- ✅ Step 5.3 (chart component)
- ✅ Step 5.4 (request detection)

---

#### **Phase 5 Testing** (15 min)
**Deliverables:** Phase 5 verified and working

**Test Cases:**
- [ ] Test: User requests "show timeline" → Chart appears
- [ ] Test: Chart displays symptom frequency correctly
- [ ] Test: Chart displays trigger frequency correctly
- [ ] Test: Chart displays patterns correctly
- [ ] Test: Chart responsive on mobile
- [ ] Test: Chart responsive on desktop
- [ ] Test: Performance (chart loads < 2 seconds)

**Success Criteria:**
- ✅ Timeline requests detected correctly
- ✅ Chart displays accurate data
- ✅ Chart responsive on all devices
- ✅ Performance acceptable

---

### **PHASE 6: Personalized Prompts & Health Summary** (2 hours)

#### **Step 6.1: Prompt Generation Logic** (1 hour)
**Deliverable:** Personalized prompt generation

**Tasks:**
- [ ] Create `generatePersonalizedPrompts()` function
- [ ] Analyze user's health profile:
  - Known conditions
  - Recent symptoms
  - Patterns
  - Age/sex
- [ ] Generate prompts based on profile:
  - Condition-specific prompts
  - Pattern-related prompts
  - Age/sex-specific prompts
- [ ] Option A: Use Gemini for complex personalization
  - Generate dynamic prompts via AI
- [ ] Option B: Use templates for common cases
  - Template-based with personalization
- [ ] Recommended: Combine both approaches
- [ ] Test prompt generation
- [ ] Test prompts are relevant

**Integration Points:**
- ✅ Service: Uses `health-profile-service.ts` for profile data
- ✅ AI: Optionally uses Gemini for generation
- ✅ Used By: Step 6.2 (UI display)

**Dependencies:**
- ✅ Phase 1-3 complete (need profile data)

---

#### **Step 6.2: Integration with UI** (30 min)
**Deliverable:** Personalized prompts in UI

**Tasks:**
- [ ] Display personalized prompts in UI
- [ ] Show prompts based on user profile
- [ ] Cache prompts for session (don't regenerate every time)
- [ ] Test prompt display
- [ ] Test prompts update when profile changes

**Integration Points:**
- ✅ Frontend: UI component (sidebar or chat area)
- ✅ Service: Calls prompt generation function

**Dependencies:**
- ✅ Step 6.1 (prompt generation)

---

#### **Step 6.3: Health Timeline Text Summary** (30 min)
**Deliverable:** Health timeline text summary (Feature 5)

**Tasks:**
- [ ] Detect user request: "Show me my health summary"
- [ ] Generate text summary from health profile:
  - Symptom frequency: "Gastric pain: 3 times"
  - Triggers: "triggers: spicy food, late dinner"
  - Patterns: "gastric pain usually after 8pm meals"
- [ ] Format summary as text (no visualization)
- [ ] Test health summary generation
- [ ] Test summary is readable and helpful

**Integration Points:**
- ✅ Service: Uses `health-profile-service.ts`
- ✅ AI: Optionally uses Gemini to format summary nicely
- ✅ Chat: Displays in chat UI

**Dependencies:**
- ✅ Phase 1-2 complete (need profile data)

---

#### **Phase 6 Testing** (30 min)
**Deliverables:** Phase 6 verified and working

**Test Cases:**
- [ ] Test: Generate prompts for user with high BP
- [ ] Test: Generate prompts for user with gastric issues
- [ ] Test: Prompts are relevant and helpful
- [ ] Test: Prompts vary over time
- [ ] Test: Health summary generates correctly
- [ ] Test: User can request "Show my health summary"

**Success Criteria:**
- ✅ Prompts personalized to user profile
- ✅ Prompts displayed in UI
- ✅ Prompts are relevant and varied
- ✅ Health timeline text summary works (Feature 5)
- ✅ User can request health summary

---

### **PHASE 6.5: AI Status Bar Enhancement** (2-3 hours) **[NEW]**

#### **Step 6.5.1: Stage Tracking System** (1 hour)
**Deliverable:** AI service tracks processing stages

**Tasks:**
- [ ] Add stage tracking to `lib/ai-pharmacist-service.ts`:
  - Define `AIProcessingStage` type
  - Track current stage during processing
  - Return current stage in response
- [ ] Add stage tracking to text query handler:
  - Track: `loading_profile`, `analyzing_question`, `cross_referencing_history`, `personalizing`
  - Emit stage updates
  - Return stage in response
- [ ] Add stage tracking to image analysis:
  - Track: `detecting_image_type`, `analyzing_food`, `analyzing_allergy`, `analyzing_medicine`
  - Track: `checking_triggers`, `cross_referencing_history`
  - Return stage in response
- [ ] Test stage tracking accuracy

**Integration Points:**
- ✅ Service: `lib/ai-pharmacist-service.ts`
- ✅ Service: `lib/food-analysis-service.ts` (if separate)
- ✅ API: `/api/ai-pharmacist/route.ts`
- ✅ API: `/api/analyze-image/route.ts`
- ✅ Used By: Step 6.5.2 (preset messages)

**Dependencies:**
- ✅ Phase 1.4 (AI pharmacist integration)
- ✅ Phase 4.2 (food analysis)
- ✅ Phase 4.5.4 (allergy analysis)

---

#### **Step 6.5.2: Preset Status Messages** (30 min)
**Deliverable:** Preset message dictionary

**Tasks:**
- [ ] Create `lib/ai-status-service.ts`:
  - Define all status stages
  - Create preset message dictionary
  - Add multi-language support (10 languages)
- [ ] Map stages to messages:
  - `loading_profile` → "Loading your health profile..."
  - `analyzing_question` → "Analyzing your question..."
  - `cross_referencing_history` → "Cross-referencing your history..."
  - `detecting_image_type` → "Identifying image type..."
  - `analyzing_food` → "Analyzing food ingredients..."
  - `analyzing_allergy` → "Analyzing allergy symptoms..."
  - `analyzing_medicine` → "Analyzing medicine..."
  - `checking_triggers` → "Checking your triggers..."
  - `personalizing` → "Personalizing recommendations..."
  - `extracting_keywords` → "Extracting health insights..."
  - `detecting_patterns` → "Detecting patterns..."
- [ ] Add status icons (🔄 💭 🔍 🎯 🍽️ 🩹 💊 📊)
- [ ] Test message accuracy

**Integration Points:**
- ✅ Used By: Step 6.5.3 (component update)
- ✅ Multi-language: Supports all app languages

**Dependencies:**
- ✅ Step 6.5.1 (stage tracking)

---

#### **Step 6.5.3: Enhanced Status Display Component** (45 min)
**Deliverable:** Updated `AIStatusDisplay.tsx`

**Tasks:**
- [ ] Update `components/AIStatusDisplay.tsx`:
  - Accept `stage` prop (not just `status` string)
  - Accept `language` prop
  - Accept `context` prop (hasProfile, imageType, etc.)
- [ ] Integrate with status service:
  - Look up preset message for stage
  - Display contextual icon
  - Show appropriate message
- [ ] Add smooth transitions:
  - Fade between stages
  - Smooth animations
- [ ] Test component updates

**Integration Points:**
- ✅ Component: `components/AIStatusDisplay.tsx`
- ✅ Service: Uses `lib/ai-status-service.ts`
- ✅ Used By: Step 6.5.4 (integration)

**Dependencies:**
- ✅ Step 6.5.2 (preset messages)

---

#### **Step 6.5.4: Integration with Handlers** (45 min)
**Deliverable:** Status bar integrated with all AI flows

**Tasks:**
- [ ] Update text query handler (`handleTextSubmit`):
  - Receive stage from AI service
  - Look up preset message for stage
  - Update status bar with stage-based message
- [ ] Update image analysis handler (`analyzeMedicineImageWithRealStatus`):
  - Receive stage from image analysis
  - Update status bar based on image type
  - Show appropriate message for food/allergy/medicine
- [ ] Add real-time stage updates (optional):
  - Via SSE if implemented
  - Via polling if needed
  - Via response callback
- [ ] Test status bar updates correctly

**Integration Points:**
- ✅ Frontend: `app/page.tsx`
- ✅ Component: `AIStatusDisplay` component
- ✅ Service: Status message service
- ✅ All AI flows: Text queries, food, allergy, medicine

**Dependencies:**
- ✅ Step 6.5.3 (component update)

---

#### **Phase 6.5 Testing** (15 min)
**Deliverables:** Phase 6.5 verified and working

**Test Cases:**
- [ ] Test: Text query → Status shows correct stages
- [ ] Test: Food photo → Status shows "Identifying image type..." → "Analyzing food..."
- [ ] Test: Allergy photo → Status shows "Analyzing allergy symptoms..."
- [ ] Test: Medicine photo → Status shows "Analyzing medicine..." (existing flow)
- [ ] Test: Profile exists → Status shows "Loading your health profile..."
- [ ] Test: Multi-language support works
- [ ] Test: Stage transitions are smooth
- [ ] Test: Status messages match actual AI stages

**Success Criteria:**
- ✅ Status messages match actual AI processing stages
- ✅ Status updates in real-time (or near real-time)
- ✅ Multi-language support works
- ✅ Smooth transitions between stages
- ✅ Accurate and realistic feel

---

### **PHASE 7: AI Status Bar Enhancement** (2-3 hours) **[NEW]**

**Note:** This phase should be integrated with existing phases for better flow. See integration notes below.

#### **Integration Strategy:**
**Option A: Incremental Integration (Recommended)**
- **Phase 1.4:** Add basic stage tracking for text queries
- **Phase 4.3:** Add stage tracking for food photo analysis
- **Phase 4.5.5:** Add stage tracking for allergy photo analysis
- **Phase 6.5:** Complete status bar enhancement (preset messages, component, polish)

**Option B: Dedicated Phase**
- **Phase 6.5:** Complete status bar enhancement as separate phase
- After Phase 6 (Personalized Prompts)
- Before Phase 7 (Final Testing)

**Recommended: Option A - Incremental Integration**

#### **Step 1.4 Enhancement: Add Stage Tracking to Text Queries** (+15 min)
**Tasks:**
- [ ] Add stage tracking to `aiPharmacist()` function
- [ ] Track stages: `loading_profile`, `analyzing_question`, `cross_referencing_history`, `personalizing`
- [ ] Return current stage in response
- [ ] Update frontend to receive stage

#### **Step 4.3 Enhancement: Add Stage Tracking to Food Analysis** (+10 min)
**Tasks:**
- [ ] Add stage tracking to `analyzeFoodPhoto()` function
- [ ] Track stages: `detecting_image_type`, `analyzing_food`, `checking_triggers`, `personalizing`
- [ ] Return current stage in response

#### **Step 4.5.5 Enhancement: Add Stage Tracking to Allergy Analysis** (+10 min)
**Tasks:**
- [ ] Add stage tracking to `analyzeAllergyPhoto()` function
- [ ] Track stages: `detecting_image_type`, `analyzing_allergy`, `cross_referencing_history`, `personalizing`
- [ ] Return current stage in response

#### **Step 6.5: Complete Status Bar Enhancement** (1.5-2 hours)
**Tasks:**
- [ ] Create `lib/ai-status-service.ts` (preset messages)
- [ ] Update `components/AIStatusDisplay.tsx` (accept stage prop)
- [ ] Integrate with all handlers (use stage-based messages)
- [ ] Add multi-language support
- [ ] Add smooth transitions
- [ ] Test all status flows

**Total Additional Time:** 2-2.5 hours (incremental) or 1.5-2 hours (dedicated)

---

### **PHASE 8: Final Testing & Bug Fixes** (2-3 hours) **[RENUMBERED]**

#### **Step 8.1: End-to-End Testing** (1.5 hours)
**Deliverables:** Complete user journey verified

**Test Complete User Journey:**
1. [ ] First message (no profile) → Extract keywords → Save
2. [ ] Second message → Load profile → Reference history
3. [ ] Pattern detection → Permission → Save pattern
4. [ ] Personal details collection → Save details
5. [ ] Follow-up questions → Gather context → Use in response
6. [ ] Symptom logging → Detect "logging symptoms" → Save symptoms
7. [ ] Food photo upload → Analyze → Trigger warning
8. [ ] Allergy question → AI asks for photo → User uploads → Analysis
9. [ ] Health summary request → Generate text summary
10. [ ] Timeline request → Display chart
11. [ ] Third message → Use all collected data
- [ ] Test with multiple users
- [ ] Test with various message types
- [ ] Test error handling (all error paths)
- [ ] Test all 11 features integration

**Success Criteria:**
- ✅ All features work together
- ✅ No conflicts between features
- ✅ Error handling works correctly
- ✅ User experience is smooth

---

#### **Step 8.2: Performance Testing** (30 min)
**Deliverables:** Performance verified

**Performance Tests:**
- [ ] Profile load time (< 100ms)
- [ ] AI response time (< 5 seconds)
- [ ] Keyword extraction time (background, non-blocking)
- [ ] Database query performance (all queries < 200ms)
- [ ] Image analysis time (< 10 seconds)
- [ ] Memory usage (acceptable levels)
- [ ] Chart rendering time (< 2 seconds)

**Success Criteria:**
- ✅ All performance metrics met
- ✅ No slow operations blocking UI
- ✅ Background tasks don't affect UX

---

#### **Step 8.3: Bug Fixes** (1 hour)
**Deliverables:** All bugs fixed

**Tasks:**
- [ ] Fix any bugs found during testing
- [ ] Test fixes
- [ ] Verify all features still work
- [ ] Regression testing

---

#### **Step 8.4: Documentation** (30 min)
**Deliverables:** Documentation complete

**Tasks:**
- [ ] Document API changes
- [ ] Document database schema
- [ ] Document new functions
- [ ] Document integration points
- [ ] Update README if needed

---

## **Complete Integration Map**

### **Database Tables:**
1. ✅ `profiles` (existing)
2. ✅ `user_health_profiles` (new - Phase 1.1)
3. ✅ `chat_history` (existing - used by Phase 5.2)

### **Services:**
1. ✅ `health-profile-service.ts` (Phase 1.2)
   - Used by: All phases that need profile data
2. ✅ `ai-pharmacist-service.ts` (Phase 1.4 - enhanced)
   - Uses: health-profile-service
3. ✅ `gemini-service.ts` (existing)
   - Used by: All AI operations

### **API Routes:**
1. ✅ `/api/ai-pharmacist` (Phase 1.4 - enhanced)
2. ✅ `/api/analyze-image` (Phase 4, 4.5 - enhanced)

### **Components:**
1. ✅ Chat UI (existing - enhanced in Phase 2.2, 5.5)
2. ✅ `HealthTimelineChart.tsx` (Phase 5.3 - new)

---

## **Dependencies Graph**

```
Phase 1.1 (Database)
  ↓
Phase 1.2 (Service)
  ↓
Phase 1.3 (Extraction)
  ↓
Phase 1.4 (Integration)
  ↓
Phase 2.1 (Pattern Detection)
  ↓
Phase 2.2 (Permission UI)
  ↓
Phase 2.3 (Pattern Saving)
  ↓
Phase 2.4 (Pattern Usage)
  ↓
Phase 3.1 (Personal Details Extraction)
  ↓
Phase 3.2 (Question Flow)
  ↓
Phase 3.3 (Save Details)
  ↓
Phase 3.4 (Use Details)
  ↓
Phase 4.1 (Image Detection) ──→ Phase 4.5.3 (Allergy Detection)
  ↓                                    ↓
Phase 4.2 (Food Analysis)          Phase 4.5.4 (Allergy Analysis)
  ↓                                    ↓
Phase 4.3 (Integration)            Phase 4.5.5 (Integration)
  ↓
Phase 5.1 (Chart Library)
  ↓
Phase 5.2 (Data Aggregation) ──→ Phase 6.3 (Health Summary)
  ↓                                    ↓
Phase 5.3 (Chart Component)          Phase 6.1 (Prompt Generation)
  ↓                                    ↓
Phase 5.4 (Request Detection)        Phase 6.2 (UI Integration)
  ↓                                    ↓
Phase 5.5 (Chat Integration)          Phase 6 (Complete)
  ↓
Phase 7 (Final Testing)
```

---

## **Critical Path (Must Complete in Order)**

1. ✅ **Phase 1.1** → Database table (foundation)
2. ✅ **Phase 1.2** → Service layer (needed by all)
3. ✅ **Phase 1.3** → Extraction (needed by 1.4)
4. ✅ **Phase 1.4** → Integration (basic memory works)
5. ✅ **Phase 2.1-2.4** → Pattern system (depends on Phase 1)
6. ✅ **Phase 3.1-3.4** → Personal details (depends on Phase 1)
7. ✅ **Phase 4.1-4.3** → Food analysis (can be parallel with 4.5)
8. ✅ **Phase 4.5.1-4.5.5** → Allergy analysis (can be parallel with 4)
9. ✅ **Phase 5.1-5.5** → Timeline (can be parallel)
10. ✅ **Phase 6.1-6.3** → Prompts & Summary (can be parallel)
11. ✅ **Phase 7** → Final testing (must be last)

---

## **Parallel Development Opportunities**

### **Can Work in Parallel:**
- Phase 4 (Food) + Phase 4.5 (Allergy) - both use image infrastructure
- Phase 5 (Timeline) + Phase 6 (Prompts) - independent features
- Phase 2 (Patterns) + Phase 3 (Personal Details) - after Phase 1 complete

### **Sequential (Must Complete First):**
- Phase 1 must complete before Phase 2, 3, 4, 4.5, 5, 6
- Phase 2.1 → 2.2 → 2.3 → 2.4 (sequential)
- Phase 3.1 → 3.2 → 3.3 → 3.4 (sequential)

---

## **Testing Strategy**

### **After Each Phase:**
1. Test phase-specific features
2. Verify database operations
3. Test AI responses
4. Check error handling
5. **Only proceed if tests pass**

### **Integration Testing:**
- After Phase 1-2: Memory + Patterns
- After Phase 3: Personal details integrated
- After Phase 4-4.5: Photo analysis suite
- After Phase 5-6: Visualization + Prompts
- After Phase 7: Complete system

---

## **Risk Mitigation**

### **Phase 1 Risks:**
- Database creation issues
- **Mitigation:** Test on dev database first
- Service layer bugs
- **Mitigation:** Unit test functions

### **Phase 2-3 Risks:**
- AI prompt issues
- **Mitigation:** Test prompts iteratively
- Integration complexity
- **Mitigation:** Test incrementally

### **Phase 4-4.5 Risks:**
- Image detection accuracy
- **Mitigation:** Test with various images
- AI analysis quality
- **Mitigation:** Refine prompts based on results

### **Phase 5-6 Risks:**
- Chart library compatibility
- **Mitigation:** Test on mobile + desktop
- Performance issues
- **Mitigation:** Optimize queries

---

## **Success Metrics**

### **Phase 1:**
- ✅ Profile loads < 100ms
- ✅ Keywords extracted correctly (>90%)
- ✅ Data saved to database
- ✅ AI references history in next chat

### **Phase 2:**
- ✅ Patterns detected accurately (>80%)
- ✅ Permission prompt appears
- ✅ Patterns saved after consent
- ✅ AI uses patterns in responses

### **Phase 3:**
- ✅ Personal details collected naturally
- ✅ Data validated and normalized
- ✅ AI uses details for personalization
- ✅ Follow-up questions work

### **Phase 4:**
- ✅ Food photos detected correctly (>90%)
- ✅ Triggers matched with profile
- ✅ Warnings generated appropriately

### **Phase 4.5:**
- ✅ Allergy questions detected (>90%)
- ✅ AI asks for photos proactively
- ✅ Allergy analysis accurate (>85%)

### **Phase 5:**
- ✅ Timeline requests detected
- ✅ Chart displays accurately
- ✅ Responsive on all devices

### **Phase 6:**
- ✅ Prompts personalized
- ✅ Prompts relevant and helpful
- ✅ Health summary generates correctly

### **Phase 7:**
- ✅ All features integrated
- ✅ Performance acceptable
- ✅ No critical bugs

---

## **Final Checklist Before Starting**

### **Preparation:**
- [ ] Review all phases in this document
- [ ] Understand dependencies
- [ ] Confirm timeline (2 days: 18-21.5 hours)
- [ ] Confirm features list (11 features + 2 bonus)
- [ ] Review integration points
- [ ] Review testing strategy

### **Environment Setup:**
- [ ] Dev database ready
- [ ] Supabase project configured
- [ ] API keys available (Gemini)
- [ ] Development environment ready
- [ ] Git branch created (optional)

### **Documentation:**
- [ ] All planning documents reviewed
- [ ] Implementation plan clear
- [ ] Success criteria understood
- [ ] Testing checklist ready

---

**Status:** ✅ **READY FOR IMPLEMENTATION**

**Total Implementation Time:** 18-21.5 hours over 2 days

**Total Features:** 11 core + 2 bonus = 13 features

**Confidence Level:** ✅ **HIGH** - All phases planned and documented

---

**Next Step:** Start Phase 1.1 - Create Database Table

