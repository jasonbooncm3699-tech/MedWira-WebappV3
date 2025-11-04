# AI Enhancement v3 - Database Requirements Analysis

## Current Database State

### Existing Tables:
1. **`profiles`** - User authentication and basic profile data
   - Columns: `id`, `email`, `display_name`, `avatar_url`, `tokens`, `referral_code`, `referral_count`, `referred_by`, `created_at`, `updated_at`, `last_login`
   - Used for: User auth, tokens, referrals

2. **`chat_history`** - Chat messages and conversations
   - Columns: `id`, `user_id`, `session_id`, `message_type`, `message_text`, `ai_response`, `message_sequence`, `image_url`, `medicine_name`, `generic_name`, `dosage`, `side_effects[]`, `interactions[]`, `warnings[]`, `storage`, `category`, `confidence`, `language`, `allergies`, `conversation_context`, `conversation_title`, `conversation_preview`, `conversation_tags[]`, `created_at`
   - Used for: Storing chat messages, medicine analysis results

3. **`medicines`** - NPRA medicine database
   - Columns: `id`, `registration_number`, `product_name`, `holder_name`, `manufacturer_name`, `dosage_form`, `strength`, `generic_name`, `created_at`, `updated_at`
   - Used for: Medicine data lookup

4. **`user_medication_stack`** (from Phase 1 transformation)
   - Columns: `id`, `user_id`, `medicine_name`, `generic_name`, `active_ingredients`, `start_date`, `end_date`, `frequency`, `dosage`, `is_active`, `chat_history_id`, `notes`, `created_at`, `updated_at`
   - Used for: Tracking current medications

---

## Required Database Changes for AI Enhancement v3

### **NEW TABLE: `user_health_profiles`**

**Purpose:** Store extracted health keywords, patterns, and user health profile data for personalized AI responses.

**Required Columns:**

```sql
CREATE TABLE IF NOT EXISTS public.user_health_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Personal Information (collected naturally during conversation)
  age INTEGER, -- User's age (when provided)
  sex VARCHAR(10), -- 'male', 'female', 'other', or NULL (when provided)
  date_of_birth DATE, -- Optional: can calculate age from DOB if preferred
  
  -- Medical History & Known Conditions
  known_conditions TEXT[], -- Array of known conditions: ['high blood pressure', 'high blood sugar', 'uric acid', 'gout', 'gastric issues', etc.]
  past_medical_history TEXT, -- Free text field for past medical history
  family_history TEXT, -- Free text field for family medical history
  
  -- Health Keywords (from Gemini extraction)
  health_keywords TEXT[], -- Array of general health keywords
  symptoms TEXT[], -- Array of symptoms mentioned
  conditions TEXT[], -- Array of conditions mentioned
  medications TEXT[], -- Array of medications user takes/asks about
  triggers TEXT[], -- Array of trigger foods/activities
  
  -- Pattern Data (symptom-trigger relationships)
  patterns JSONB, -- Store pattern objects like: [{"symptom": "gastric pain", "trigger": "spicy food", "frequency": 3, "confirmed": true}]
  
  -- Personal Details Collection Status
  personal_details_collected BOOLEAN DEFAULT false, -- True when AI has collected basic personal info
  details_collection_date TIMESTAMP WITH TIME ZONE, -- When personal details were collected
  details_completeness JSONB, -- Track which details are collected: {"age": true, "sex": true, "known_conditions": true}
  
  -- Consent & Permissions
  pattern_tracking_consent BOOLEAN DEFAULT false, -- User permission to track patterns
  consent_given_at TIMESTAMP WITH TIME ZONE, -- When user gave consent
  consent_withdrawn_at TIMESTAMP WITH TIME ZONE, -- If user withdraws consent
  
  -- Metadata
  last_extraction_at TIMESTAMP WITH TIME ZONE, -- Last time health data was extracted
  extraction_count INTEGER DEFAULT 0, -- Number of times health data has been extracted
  total_chats_analyzed INTEGER DEFAULT 0, -- Total chats analyzed for this user
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id) -- One health profile per user
);
```

**Indexes Needed:**
```sql
CREATE INDEX idx_user_health_profiles_user_id ON public.user_health_profiles(user_id);
CREATE INDEX idx_user_health_profiles_symptoms ON public.user_health_profiles USING GIN(symptoms);
CREATE INDEX idx_user_health_profiles_conditions ON public.user_health_profiles USING GIN(conditions);
CREATE INDEX idx_user_health_profiles_known_conditions ON public.user_health_profiles USING GIN(known_conditions);
CREATE INDEX idx_user_health_profiles_patterns ON public.user_health_profiles USING GIN(patterns);
CREATE INDEX idx_user_health_profiles_age ON public.user_health_profiles(age); -- For age-based queries
```

**RLS Policies:**
```sql
ALTER TABLE public.user_health_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own health profile
CREATE POLICY "Users can view own health profile" ON public.user_health_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own health profile
CREATE POLICY "Users can update own health profile" ON public.user_health_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow system to insert health profiles (via service role or trigger)
CREATE POLICY "Allow health profile creation" ON public.user_health_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### **NEW TABLE: `health_pattern_consents`** (Optional - for detailed tracking)

**Purpose:** Track individual pattern consents separately (if you want granular permission control).

**Alternative:** Can store in `user_health_profiles.patterns` JSONB with a `confirmed: true/false` field.

```sql
CREATE TABLE IF NOT EXISTS public.health_pattern_consents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_id UUID, -- Reference to pattern in user_health_profiles.patterns (if you want separate tracking)
  symptom TEXT NOT NULL,
  trigger TEXT,
  consent_status TEXT DEFAULT 'pending' CHECK (consent_status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  asked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, symptom, trigger) -- One consent per pattern
);
```

**Decision Point:** 
- Simple approach: Store consent in `user_health_profiles.pattern_tracking_consent` (global consent)
- Advanced approach: Store per-pattern consent in separate table or JSONB

**Recommendation:** Start with simple global consent, add per-pattern consent later if needed.

---

## Database Functions Needed

### 1. **Function to Initialize Health Profile**
```sql
CREATE OR REPLACE FUNCTION initialize_user_health_profile(user_uuid UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_health_profiles (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. **Function to Update Health Keywords** (via Gemini extraction)
```sql
CREATE OR REPLACE FUNCTION update_health_keywords(
  user_uuid UUID,
  new_keywords TEXT[],
  new_symptoms TEXT[],
  new_conditions TEXT[],
  new_medications TEXT[],
  new_triggers TEXT[]
)
RETURNS void AS $$
BEGIN
  UPDATE public.user_health_profiles
  SET 
    health_keywords = COALESCE(new_keywords, health_keywords) || health_keywords,
    symptoms = COALESCE(new_symptoms, symptoms) || symptoms,
    conditions = COALESCE(new_conditions, conditions) || conditions,
    medications = COALESCE(new_medications, medications) || medications,
    triggers = COALESCE(new_triggers, triggers) || triggers,
    last_extraction_at = NOW(),
    extraction_count = extraction_count + 1,
    total_chats_analyzed = total_chats_analyzed + 1,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. **Function to Add Pattern** (when user consents)
```sql
CREATE OR REPLACE FUNCTION add_health_pattern(
  user_uuid UUID,
  symptom_text TEXT,
  trigger_text TEXT,
  frequency INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  pattern_json JSONB;
BEGIN
  pattern_json := jsonb_build_object(
    'symptom', symptom_text,
    'trigger', trigger_text,
    'frequency', frequency,
    'confirmed', true,
    'created_at', NOW()::text
  );
  
  UPDATE public.user_health_profiles
  SET 
    patterns = COALESCE(patterns, '[]'::jsonb) || pattern_json::jsonb,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. **Function to Update Consent Status**
```sql
CREATE OR REPLACE FUNCTION update_pattern_tracking_consent(
  user_uuid UUID,
  consent_given BOOLEAN
)
RETURNS void AS $$
BEGIN
  UPDATE public.user_health_profiles
  SET 
    pattern_tracking_consent = consent_given,
    consent_given_at = CASE WHEN consent_given THEN NOW() ELSE consent_given_at END,
    consent_withdrawn_at = CASE WHEN NOT consent_given THEN NOW() ELSE consent_withdrawn_at END,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **5. Function to Update Personal Details** (NEW)
```sql
CREATE OR REPLACE FUNCTION update_personal_details(
  user_uuid UUID,
  age_value INTEGER DEFAULT NULL,
  sex_value VARCHAR(10) DEFAULT NULL,
  known_conditions_value TEXT[] DEFAULT NULL,
  past_history_value TEXT DEFAULT NULL,
  family_history_value TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.user_health_profiles
  SET 
    age = COALESCE(age_value, age),
    sex = COALESCE(sex_value, sex),
    known_conditions = COALESCE(known_conditions_value, known_conditions),
    past_medical_history = COALESCE(past_history_value, past_medical_history),
    family_history = COALESCE(family_history_value, family_history),
    personal_details_collected = CASE 
      WHEN age IS NOT NULL OR sex IS NOT NULL OR known_conditions IS NOT NULL 
      THEN true 
      ELSE personal_details_collected 
    END,
    details_collection_date = CASE 
      WHEN age IS NOT NULL OR sex IS NOT NULL OR known_conditions IS NOT NULL 
      THEN NOW() 
      ELSE details_collection_date 
    END,
    details_completeness = jsonb_build_object(
      'age', age IS NOT NULL,
      'sex', sex IS NOT NULL,
      'known_conditions', array_length(known_conditions, 1) > 0,
      'past_history', past_medical_history IS NOT NULL,
      'family_history', family_history IS NOT NULL
    ),
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **6. Function to Normalize Condition Names** (NEW)
```sql
CREATE OR REPLACE FUNCTION normalize_condition_name(condition_text TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- Normalize common condition name variations
  normalized := LOWER(TRIM(condition_text));
  
  -- Map common variations to standard names
  CASE normalized
    WHEN 'high bp' THEN normalized := 'high blood pressure';
    WHEN 'hypertension' THEN normalized := 'high blood pressure';
    WHEN 'high blood sugar' THEN normalized := 'diabetes';
    WHEN 'diabetes mellitus' THEN normalized := 'diabetes';
    WHEN 'high uric acid' THEN normalized := 'gout';
    WHEN 'gastric' THEN normalized := 'gastric issues';
    WHEN 'stomach problems' THEN normalized := 'gastric issues';
    ELSE normalized := condition_text; -- Keep original if no mapping
  END CASE;
  
  RETURN normalized;
END;
$$ LANGUAGE plpgsql;
```

---

## Integration with Existing Tables

### **Updates to `chat_history` Table:**

**Current State:** Already has good structure for health data extraction:
- ✅ `message_text` - For extracting keywords from user messages
- ✅ `ai_response` - For extracting keywords from AI responses
- ✅ `medicine_name`, `generic_name` - Already tracking medications
- ✅ `session_id` - Can track conversation patterns
- ✅ `created_at` - For timeline analysis

**Potential Additions (Optional):**
```sql
-- Add health extraction metadata to chat_history
ALTER TABLE public.chat_history 
  ADD COLUMN IF NOT EXISTS health_keywords_extracted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS extraction_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS extraction_batch_id UUID; -- To track batch extractions
```

**Recommendation:** Don't modify `chat_history` table. Extract data from existing columns when needed.

---

## Database Migration Strategy

### Phase 1: Core Memory System
1. ✅ Create `user_health_profiles` table
2. ✅ Create indexes for performance
3. ✅ Set up RLS policies
4. ✅ Create initialization function
5. ✅ Create update functions

### Phase 2: Pattern Recognition
6. ✅ Add pattern storage (JSONB column)
7. ✅ Create pattern management functions
8. ✅ Add consent tracking

### Phase 3: Advanced Features (Future)
9. Timeline visualization queries (use existing `chat_history.created_at`)
10. Pattern frequency analysis queries
11. Symptom-trigger correlation queries

---

## Data Flow Example

```
1. User sends message: "Having gastric pain after eating spicy food"
   ↓
2. Save to chat_history (existing flow)
   ↓
3. Gemini extracts keywords: {symptoms: ["gastric pain"], triggers: ["spicy food"]}
   ↓
4. Update user_health_profiles:
   - Add "gastric pain" to symptoms array
   - Add "spicy food" to triggers array
   - Increment extraction_count
   ↓
5. AI detects pattern: gastric pain + spicy food
   ↓
6. Ask permission: "Want me to remember this pattern?"
   ↓
7. User clicks "Yes"
   ↓
8. Add pattern to user_health_profiles.patterns:
   {
     "symptom": "gastric pain",
     "trigger": "spicy food",
     "frequency": 1,
     "confirmed": true,
     "created_at": "2024-01-15T10:30:00Z"
   }
   ↓
9. Next chat uses pattern:
   User: "Stomach pain again"
   AI: "I remember you mentioned gastric pain after spicy food. Is this similar?"
```

---

## Storage Estimates

**Per User Health Profile:**
- Basic profile: ~500 bytes
- With 10 patterns: ~2KB
- With 50 extracted keywords: ~5KB
- **Total per user: ~5-10KB**

**For 10,000 users:**
- Estimated total: ~50-100MB (negligible)

---

## Security Considerations

1. **RLS Enabled:** ✅ Users can only access their own health data
2. **Consent Tracking:** ✅ Store user consent explicitly
3. **Data Privacy:** ✅ Health data is encrypted at rest (Supabase default)
4. **Access Control:** ✅ Only authenticated users can read/write their own data
5. **Audit Trail:** ✅ `created_at`, `updated_at`, `consent_given_at` track all changes

---

## Performance Considerations

1. **Indexes:** GIN indexes on arrays and JSONB for fast queries
2. **Array Deduplication:** PostgreSQL arrays don't automatically deduplicate - consider using SET data type or deduplicate in application code
3. **JSONB Size:** Keep patterns JSONB reasonably sized (limit to last 100 patterns per user)
4. **Query Optimization:** Use `EXPLAIN ANALYZE` on pattern queries to optimize

---

## Questions to Finalize

1. **Pattern Storage:**
   - ✅ Use JSONB array in `user_health_profiles.patterns`
   - ❌ OR separate `health_patterns` table?
   - **Recommendation:** Start with JSONB, migrate to table if patterns become complex

2. **Keyword Deduplication:**
   - ✅ Store as arrays with duplicates
   - ❌ OR deduplicate on insert?
   - **Recommendation:** Allow duplicates for frequency tracking, deduplicate in queries

3. **Consent Granularity:**
   - ✅ Global consent (`pattern_tracking_consent`)
   - ❌ OR per-pattern consent?
   - **Recommendation:** Start global, add per-pattern later if needed

4. **Health Profile Initialization:**
   - ✅ Create on first chat
   - ❌ OR create on user signup?
   - **Recommendation:** Create lazily on first health extraction (saves database space)

---

## SQL Migration Script Summary

**File:** `database/AI_ENHANCEMENT_V3_CREATE_HEALTH_PROFILES.sql`

**Contents:**
- Create `user_health_profiles` table
- Create indexes
- Set up RLS policies
- Create helper functions
- Add triggers (if needed)

---

## Next Steps

1. ✅ Review this analysis
2. ⏳ Finalize database schema decisions
3. ⏳ Create SQL migration script
4. ⏳ Test migration script on dev database
5. ⏳ Implement application code changes
6. ⏳ Test end-to-end flow

---

**Status:** 🔴 **ANALYSIS COMPLETE - AWAITING FINALIZATION**

