# AI Enhancement v3 - 2-Day Implementation Plan

## Database Tables Clarification

### **Total Tables: 2 Tables**

#### **Table 1: `profiles` (EXISTING - Already Created)**
**Purpose:** User authentication and basic profile data
**Status:** ✅ Already exists in your database

**Columns:**
- `id` - UUID (references auth.users)
- `email` - User email
- `display_name` - User name
- `avatar_url` - Profile picture
- `tokens` - Token balance
- `referral_code` - Referral code
- `referral_count` - Referral count
- `referred_by` - Referrer code
- `created_at`, `updated_at`, `last_login` - Timestamps

**Used For:**
- User authentication
- Token management
- Referral system
- Basic profile info

---

#### **Table 2: `user_health_profiles` (NEW - To Be Created)**
**Purpose:** Store health profile data, keywords, patterns, personal details
**Status:** ❌ Need to create

**Columns:**
- `id` - UUID (primary key)
- `user_id` - UUID (references profiles.id)
- **Personal Info:** `age`, `sex`, `date_of_birth`
- **Medical History:** `known_conditions[]`, `past_medical_history`, `family_history`
- **Health Keywords:** `health_keywords[]`, `symptoms[]`, `conditions[]`, `medications[]`, `triggers[]`
- **Patterns:** `patterns` (JSONB)
- **Status:** `personal_details_collected`, `pattern_tracking_consent`
- **Metadata:** `last_extraction_at`, `extraction_count`, `total_chats_analyzed`
- **Timestamps:** `created_at`, `updated_at`

**Used For:**
- Health profile storage
- Keyword extraction results
- Pattern detection data
- Personal details collection

---

## **Summary: 2 Tables Total**
1. ✅ `profiles` - EXISTING (user auth & basic info)
2. ❌ `user_health_profiles` - NEW (health data & patterns)

**Relationship:**
```
profiles (1) ──→ (1) user_health_profiles
   ↑                    ↑
   └── user_id references profiles.id
```

---

## 2-Day Implementation Plan

### **Timeline Overview:**
- **Day 1:** Phase 1 + Phase 2 (Foundation & Core Features)
- **Day 2:** Phase 3 + Phase 4 + Phase 5 (Advanced Features & Testing)

### **Feature Coverage Summary:**
✅ **Covered Features (8 out of 10):**
1. ✅ Conversational Memory System (Phase 1)
2. ✅ Pattern Recognition (Phase 2)
3. ❌ Food Photo Analysis (SKIP - can add later)
4. ✅ Natural Follow-up Questions (Phase 3) - **NEW**
5. ✅ Health Timeline Text Summary (Phase 4) - **NEW**
6. ✅ Permission & Consent (Phase 2)
7. ❌ Health Timeline Visualization (SKIP - can add later)
8. ✅ Symptom Logging (Phase 1) - **NEW**
9. ✅ Smart Contextual Reminders (Phase 4 - via personalized prompts)
10. ✅ Database Integration with Context (Phase 3)

**Plus:**
- ✅ Personal Details Collection (Phase 3) - **DISCUSSED**
- ✅ Personalized Prompt Suggestions (Phase 4) - **DISCUSSED**

**Coverage: 8/10 core features + 2 bonus features = 10 total features**

---

## **DAY 1: Foundation & Core Features**

### **Phase 1: Database Setup & Basic Memory** (3-4 hours)
**Goal:** Get database ready and basic memory working

#### **Step 1.1: Create Database Table** (30 min)
- [ ] Create `user_health_profiles` table SQL script
- [ ] Create indexes (GIN indexes for arrays/JSONB)
- [ ] Set up RLS policies
- [ ] Test table creation on dev database
- [ ] Verify RLS policies work correctly

**Deliverable:** `database/CREATE_USER_HEALTH_PROFILES.sql`

#### **Step 1.2: Create Health Profile Service** (1-2 hours)
- [ ] Create `lib/health-profile-service.ts`
- [ ] Implement `loadUserHealthProfile()`
- [ ] Implement `initializeHealthProfile()`
- [ ] Implement `updateHealthProfile()`
- [ ] Add error handling and fallbacks
- [ ] Test service functions

**Deliverable:** `lib/health-profile-service.ts`

#### **Step 1.3: Basic Keyword Extraction & Symptom Logging** (1 hour)
- [ ] Create keyword extraction function
- [ ] Use Gemini to extract: symptoms, conditions, medications, triggers
- [ ] Return structured JSON format
- [ ] **NEW:** Detect explicit symptom logging ("Logging symptoms: ...")
- [ ] **NEW:** Extract symptoms from logging messages
- [ ] Test extraction with sample messages
- [ ] Test symptom logging detection

**Deliverable:** `extractHealthKeywords()` function + symptom logging support

#### **Step 1.4: Integrate with AI Pharmacist** (1 hour)
- [ ] Modify `lib/ai-pharmacist-service.ts`
- [ ] Load health profile before AI response
- [ ] Add profile context to prompts
- [ ] Extract keywords in background after response
- [ ] Save extracted data to database
- [ ] Test end-to-end: message → extract → save → next message loads

**Deliverable:** Updated `ai-pharmacist-service.ts`

#### **Phase 1 Testing** (30 min)
- [ ] Test: Send message → Check database → Verify data saved
- [ ] Test: Send second message → Verify profile loaded → Verify AI references history
- [ ] Test error handling (profile load fails, extraction fails)
- [ ] Verify performance (< 100ms profile load)

**✅ Phase 1 Success Criteria:**
- ✅ Health profile table created and working
- ✅ Keywords extracted and saved
- ✅ **NEW:** Symptom logging detected and saved (Feature 8)
- ✅ Next conversation loads profile
- ✅ AI references previous conversations

---

### **Phase 2: Pattern Detection & Permission System** (3-4 hours)
**Goal:** Detect patterns and ask user permission

#### **Step 2.1: Pattern Detection Logic** (1.5 hours)
- [ ] Create pattern detection function
- [ ] Detect symptom + trigger combinations
- [ ] Calculate pattern confidence
- [ ] Check if pattern already exists
- [ ] Test pattern detection with various messages

**Deliverable:** `detectPattern()` function

#### **Step 2.2: Permission Prompt UI** (1 hour)
- [ ] Create permission prompt component (if needed)
- [ ] Add permission prompt to AI response
- [ ] Add buttons: [Yes, remember] [No thanks] [Maybe later]
- [ ] Style permission prompt (non-intrusive)
- [ ] Test UI on mobile and desktop

**Deliverable:** Permission prompt in chat UI

#### **Step 2.3: Pattern Saving** (1 hour)
- [ ] Implement `savePattern()` function
- [ ] Save pattern when user consents
- [ ] Update pattern frequency if pattern exists
- [ ] Update pattern tracking consent status
- [ ] Test pattern saving

**Deliverable:** Pattern saving functionality

#### **Step 2.4: Pattern Usage in AI** (30 min)
- [ ] Update AI prompts to use saved patterns
- [ ] Reference patterns in responses
- [ ] Test: Save pattern → Next chat uses pattern

**Deliverable:** Pattern-aware AI responses

#### **Phase 2 Testing** (30 min)
- [ ] Test: Detect pattern → Show permission → User clicks "Yes" → Pattern saved
- [ ] Test: Next conversation → AI references pattern
- [ ] Test: Pattern frequency updates correctly
- [ ] Test: Permission state persists

**✅ Phase 2 Success Criteria:**
- ✅ Patterns detected correctly
- ✅ Permission prompt appears
- ✅ Patterns saved after consent
- ✅ AI uses patterns in responses

---

## **DAY 2: Advanced Features & Testing**

### **Phase 3: Personal Details Collection** (2-3 hours)
**Goal:** Collect personal details naturally

#### **Step 3.1: Personal Details Extraction** (1 hour)
- [ ] Create personal details extraction function
- [ ] Extract: age, sex, known conditions, medical history
- [ ] Normalize condition names ("high BP" → "high blood pressure")
- [ ] Validate extracted data (age range, sex values)
- [ ] Test extraction with various messages

**Deliverable:** `extractPersonalDetails()` function

#### **Step 3.2: Natural Question Flow & Follow-up Questions** (1.5 hours)
- [ ] Update AI prompts to ask for personal details naturally
- [ ] Only ask when relevant to current question
- [ ] Don't ask all at once - spread across conversations
- [ ] Allow users to skip questions
- [ ] **NEW:** Implement natural follow-up questions (Feature 4)
- [ ] **NEW:** AI asks relevant questions during conversation:
  - "To give you the best advice, I need to understand:"
  - "When did it start?"
  - "What did you eat today?"
  - "Pain level 1-10?"
- [ ] **NEW:** Gather context naturally (not form-like)
- [ ] Test question flow (natural, not form-like)
- [ ] Test follow-up questions work correctly

**Deliverable:** Natural personal details collection + follow-up questions

#### **Step 3.3: Save Personal Details** (30 min)
- [ ] Implement `updatePersonalDetails()` function
- [ ] Save age, sex, known conditions to database
- [ ] Update `personal_details_collected` flag
- [ ] Track completeness (what's collected)
- [ ] Test data saving

**Deliverable:** Personal details saving

#### **Step 3.4: Use Personal Details in AI** (30 min)
- [ ] Update AI prompts to include personal details
- [ ] Use age/sex for personalized advice
- [ ] Use known conditions for safety warnings
- [ ] Test: Collect details → Use in AI response

**Deliverable:** Personal details in AI responses

#### **Phase 3 Testing** (30 min)
- [ ] Test: AI asks for age naturally → User provides → Saved
- [ ] Test: AI asks for known conditions → User provides → Saved
- [ ] Test: Next conversation uses collected details
- [ ] Test: Condition normalization works

**✅ Phase 3 Success Criteria:**
- ✅ Personal details collected naturally
- ✅ Data saved correctly
- ✅ AI uses personal details in responses
- ✅ Condition names normalized
- ✅ **NEW:** Natural follow-up questions work (Feature 4)
- ✅ **NEW:** AI gathers context naturally (not form-like)

---

### **Phase 4: Personalized Prompt Suggestions** (2 hours)
**Goal:** AI-generated personalized prompt suggestions

#### **Step 4.1: Prompt Generation Logic** (1 hour)
- [ ] Create `generatePersonalizedPrompts()` function
- [ ] Analyze user's health profile
- [ ] Generate prompts based on:
  - Known conditions
  - Recent symptoms
  - Patterns
  - Age/sex
- [ ] Use Gemini for complex personalization OR templates for common cases
- [ ] Test prompt generation

**Deliverable:** Personalized prompt generation

#### **Step 4.2: Integration with UI** (30 min)
- [ ] Display personalized prompts in UI
- [ ] Show prompts based on user profile
- [ ] Cache prompts for session (don't regenerate every time)
- [ ] Test prompt display

**Deliverable:** Personalized prompts in UI

#### **Step 4.3: Prompt Variety & Health Timeline Text Summary** (1 hour)
- [ ] Ensure prompts are different each time
- [ ] Track shown prompts (don't repeat)
- [ ] Rotate prompts based on new information
- [ ] Test prompt variety
- [ ] **NEW:** Health Timeline Text Summary (Feature 5)
- [ ] **NEW:** Detect user request: "Show me my health summary"
- [ ] **NEW:** Generate text summary from health profile:
  - Symptom frequency (e.g., "Gastric pain: 3 times")
  - Triggers (e.g., "triggers: spicy food, late dinner")
  - Patterns (e.g., "gastric pain usually after 8pm meals")
- [ ] **NEW:** Format summary as text (no visualization needed)
- [ ] Test health summary generation

**Deliverable:** Varied prompt suggestions + health timeline text summary

#### **Phase 4 Testing** (30 min)
- [ ] Test: Generate prompts for user with high BP
- [ ] Test: Generate prompts for user with gastric issues
- [ ] Test: Prompts are relevant and helpful
- [ ] Test: Prompts vary over time

**✅ Phase 4 Success Criteria:**
- ✅ Prompts personalized to user profile
- ✅ Prompts displayed in UI
- ✅ Prompts are relevant and varied
- ✅ **NEW:** Health timeline text summary works (Feature 5)
- ✅ **NEW:** User can request "Show me my health summary"

---

### **Phase 5: Final Testing & Bug Fixes** (2-3 hours)
**Goal:** Comprehensive testing and bug fixes

#### **Step 5.1: End-to-End Testing** (1.5 hours)
- [ ] Test complete user journey:
  1. First message (no profile) → Extract keywords → Save
  2. Second message → Load profile → Reference history
  3. Pattern detection → Permission → Save pattern
  4. Personal details collection → Save details
  5. **NEW:** Follow-up questions → Gather context → Use in response
  6. **NEW:** Symptom logging → Detect "logging symptoms" → Save symptoms
  7. **NEW:** Health summary request → Generate text summary
  8. Third message → Use all collected data
- [ ] Test with multiple users
- [ ] Test with various message types
- [ ] Test error handling
- [ ] **NEW:** Test all 10 features integration

#### **Step 5.2: Performance Testing** (30 min)
- [ ] Profile load time (< 100ms)
- [ ] AI response time (< 5 seconds)
- [ ] Keyword extraction time (background, non-blocking)
- [ ] Database query performance
- [ ] Memory usage

#### **Step 5.3: Bug Fixes** (1 hour)
- [ ] Fix any bugs found during testing
- [ ] Test fixes
- [ ] Verify all features work

#### **Step 5.4: Documentation** (30 min)
- [ ] Document API changes
- [ ] Document database schema
- [ ] Document new functions
- [ ] Update README if needed

---

## **Implementation Checklist**

### **Day 1: Foundation**
- [ ] Phase 1.1: Create database table
- [ ] Phase 1.2: Create health profile service
- [ ] Phase 1.3: Basic keyword extraction
- [ ] Phase 1.4: Integrate with AI pharmacist
- [ ] Phase 1 Testing
- [ ] Phase 2.1: Pattern detection logic
- [ ] Phase 2.2: Permission prompt UI
- [ ] Phase 2.3: Pattern saving
- [ ] Phase 2.4: Pattern usage in AI
- [ ] Phase 2 Testing

### **Day 2: Advanced Features**
- [ ] Phase 3.1: Personal details extraction
- [ ] Phase 3.2: Natural question flow
- [ ] Phase 3.3: Save personal details
- [ ] Phase 3.4: Use personal details in AI
- [ ] Phase 3 Testing
- [ ] Phase 4.1: Prompt generation logic
- [ ] Phase 4.2: Integration with UI
- [ ] Phase 4.3: Prompt variety & rotation
- [ ] Phase 4 Testing
- [ ] Phase 5.1: End-to-end testing
- [ ] Phase 5.2: Performance testing
- [ ] Phase 5.3: Bug fixes
- [ ] Phase 5.4: Documentation

---

## **File Structure After Implementation**

### **New Files:**
```
lib/
  ├── health-profile-service.ts          (NEW)
  └── ai-pharmacist-service.ts          (UPDATED)

database/
  ├── CREATE_USER_HEALTH_PROFILES.sql    (NEW)
  └── health-profile-functions.sql       (NEW - Optional)
```

### **Updated Files:**
```
lib/
  ├── ai-pharmacist-service.ts          (UPDATE - Add profile loading)
  └── gemini-service.ts                 (UPDATE - If needed)

app/api/
  └── ai-pharmacist/route.ts            (UPDATE - Pass userId)
```

---

## **Testing Strategy After Each Phase**

### **After Phase 1:**
- ✅ Test: Send message → Verify keywords extracted
- ✅ Test: Send second message → Verify profile loaded
- ✅ Test: Verify AI references previous conversation

### **After Phase 2:**
- ✅ Test: Detect pattern → Show permission
- ✅ Test: User consents → Pattern saved
- ✅ Test: Next message → AI uses pattern

### **After Phase 3:**
- ✅ Test: AI asks for personal details naturally
- ✅ Test: User provides details → Saved
- ✅ Test: AI uses details in response

### **After Phase 4:**
- ✅ Test: Personalized prompts generated
- ✅ Test: Prompts displayed in UI
- ✅ Test: Prompts are relevant

### **After Phase 5:**
- ✅ Complete end-to-end testing
- ✅ Performance verification
- ✅ Bug fixes completed

---

## **Priority Features for 2-Day Timeline**

### **MUST HAVE (Critical):**
1. ✅ Database table creation
2. ✅ Health profile service
3. ✅ Keyword extraction
4. ✅ Profile loading in AI
5. ✅ Pattern detection
6. ✅ Permission system
7. ✅ Pattern saving

### **SHOULD HAVE (Important):**
8. ✅ Personal details collection
9. ✅ Personalized prompt suggestions
10. ✅ **Natural follow-up questions (Feature 4)** - NEW
11. ✅ **Symptom logging (Feature 8)** - NEW
12. ✅ **Health timeline text summary (Feature 5)** - NEW

### **NICE TO HAVE (Can Skip for Now):**
- ❌ Food photo trigger detection (Feature 3 - can add later)
- ❌ Timeline visualization (Feature 7 - can add later)
- ❌ Advanced analytics (can add later)

---

## **Risk Mitigation**

### **Day 1 Risks:**
- Risk: Database creation takes longer
- Mitigation: Prepare SQL scripts in advance
- Risk: Integration breaks existing code
- Mitigation: Test incrementally, have rollback ready

### **Day 2 Risks:**
- Risk: Prompt personalization not ready
- Mitigation: Start with templates, improve with Gemini later
- Risk: Not enough testing time
- Mitigation: Focus on critical path, skip nice-to-have features

---

## **Success Metrics**

### **Phase 1:**
- ✅ Profile loads in < 100ms
- ✅ Keywords extracted correctly
- ✅ Data saved to database
- ✅ AI references history in next chat

### **Phase 2:**
- ✅ Patterns detected accurately (> 80%)
- ✅ Permission prompt appears
- ✅ Patterns saved after consent
- ✅ AI uses patterns in responses

### **Phase 3:**
- ✅ Personal details collected naturally
- ✅ Data validated and normalized
- ✅ AI uses details for personalization

### **Phase 4:**
- ✅ Personalized prompts generated
- ✅ Prompts relevant to user profile
- ✅ Prompts varied over time

---

## **Next Steps**

1. ✅ Review this plan
2. ✅ Confirm database structure (2 tables)
3. ✅ Prioritize features if needed
4. ✅ Start Phase 1 implementation
5. ✅ Test after each phase
6. ✅ Proceed to next phase after testing passes

---

**Status:** 🔴 **READY TO START IMPLEMENTATION**

**Database Answer:**
- **1 existing table:** `profiles` (user auth & basic info)
- **1 new table:** `user_health_profiles` (health data)
- **Total: 2 tables** for user profiles

