-- ============================================================================
-- AI Enhancement v3: User Health Profiles Table
-- Phase 1.1: Database Setup
-- ============================================================================
-- This script creates the user_health_profiles table for storing health data,
-- keywords, patterns, and personal details collected through conversations.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MAIN TABLE: user_health_profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_health_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
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

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Primary lookup by user_id (most common query)
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_user_id 
  ON public.user_health_profiles(user_id);

-- GIN indexes for array columns (fast array queries)
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_symptoms 
  ON public.user_health_profiles USING GIN(symptoms);

CREATE INDEX IF NOT EXISTS idx_user_health_profiles_conditions 
  ON public.user_health_profiles USING GIN(conditions);

CREATE INDEX IF NOT EXISTS idx_user_health_profiles_medications 
  ON public.user_health_profiles USING GIN(medications);

CREATE INDEX IF NOT EXISTS idx_user_health_profiles_triggers 
  ON public.user_health_profiles USING GIN(triggers);

CREATE INDEX IF NOT EXISTS idx_user_health_profiles_known_conditions 
  ON public.user_health_profiles USING GIN(known_conditions);

-- GIN index for JSONB patterns (fast pattern queries)
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_patterns 
  ON public.user_health_profiles USING GIN(patterns);

-- Index for age-based queries (optional, for age-based personalization)
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_age 
  ON public.user_health_profiles(age) 
  WHERE age IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.user_health_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view own health profile" ON public.user_health_profiles;
DROP POLICY IF EXISTS "Users can update own health profile" ON public.user_health_profiles;
DROP POLICY IF EXISTS "Allow health profile creation" ON public.user_health_profiles;
DROP POLICY IF EXISTS "Service role can manage health profiles" ON public.user_health_profiles;

-- Users can only view their own health profile
CREATE POLICY "Users can view own health profile" 
  ON public.user_health_profiles
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can update their own health profile
CREATE POLICY "Users can update own health profile" 
  ON public.user_health_profiles
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can insert their own health profile
CREATE POLICY "Allow health profile creation" 
  ON public.user_health_profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all health profiles (for backend operations)
CREATE POLICY "Service role can manage health profiles" 
  ON public.user_health_profiles
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to initialize health profile (creates empty profile for new user)
CREATE OR REPLACE FUNCTION initialize_user_health_profile(user_uuid UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_health_profiles (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Function to update health keywords (merges arrays with deduplication)
CREATE OR REPLACE FUNCTION update_health_keywords(
  user_uuid UUID,
  new_keywords TEXT[] DEFAULT NULL,
  new_symptoms TEXT[] DEFAULT NULL,
  new_conditions TEXT[] DEFAULT NULL,
  new_medications TEXT[] DEFAULT NULL,
  new_triggers TEXT[] DEFAULT NULL
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_health_profiles
  SET 
    -- Merge arrays and deduplicate (only add new items)
    health_keywords = CASE 
      WHEN new_keywords IS NOT NULL THEN 
        (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(health_keywords, ARRAY[]::TEXT[]) || new_keywords)))
      ELSE health_keywords
    END,
    symptoms = CASE 
      WHEN new_symptoms IS NOT NULL THEN 
        (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(symptoms, ARRAY[]::TEXT[]) || new_symptoms)))
      ELSE symptoms
    END,
    conditions = CASE 
      WHEN new_conditions IS NOT NULL THEN 
        (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(conditions, ARRAY[]::TEXT[]) || new_conditions)))
      ELSE conditions
    END,
    medications = CASE 
      WHEN new_medications IS NOT NULL THEN 
        (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(medications, ARRAY[]::TEXT[]) || new_medications)))
      ELSE medications
    END,
    triggers = CASE 
      WHEN new_triggers IS NOT NULL THEN 
        (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(triggers, ARRAY[]::TEXT[]) || new_triggers)))
      ELSE triggers
    END,
    last_extraction_at = NOW(),
    extraction_count = extraction_count + 1,
    total_chats_analyzed = total_chats_analyzed + 1,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$;

-- Function to update personal details
CREATE OR REPLACE FUNCTION update_personal_details(
  user_uuid UUID,
  age_value INTEGER DEFAULT NULL,
  sex_value VARCHAR(10) DEFAULT NULL,
  known_conditions_value TEXT[] DEFAULT NULL,
  past_history_value TEXT DEFAULT NULL,
  family_history_value TEXT DEFAULT NULL
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_health_profiles
  SET 
    age = COALESCE(age_value, age),
    sex = COALESCE(sex_value, sex),
    known_conditions = CASE 
      WHEN known_conditions_value IS NOT NULL THEN 
        (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(known_conditions, ARRAY[]::TEXT[]) || known_conditions_value)))
      ELSE known_conditions
    END,
    past_medical_history = COALESCE(past_history_value, past_medical_history),
    family_history = COALESCE(family_history_value, family_history),
    personal_details_collected = CASE 
      WHEN age_value IS NOT NULL OR sex_value IS NOT NULL OR known_conditions_value IS NOT NULL 
      THEN true 
      ELSE personal_details_collected 
    END,
    details_collection_date = CASE 
      WHEN age_value IS NOT NULL OR sex_value IS NOT NULL OR known_conditions_value IS NOT NULL 
      THEN COALESCE(details_collection_date, NOW())
      ELSE details_collection_date 
    END,
    details_completeness = jsonb_build_object(
      'age', COALESCE(age_value, age) IS NOT NULL,
      'sex', COALESCE(sex_value, sex) IS NOT NULL,
      'known_conditions', array_length(COALESCE(known_conditions_value, known_conditions), 1) > 0,
      'past_history', COALESCE(past_history_value, past_medical_history) IS NOT NULL,
      'family_history', COALESCE(family_history_value, family_history) IS NOT NULL
    ),
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$;

-- Function to normalize condition names (standardize variations)
CREATE OR REPLACE FUNCTION normalize_condition_name(condition_text TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
AS $$
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
    WHEN 'stomach issues' THEN normalized := 'gastric issues';
    ELSE normalized := condition_text; -- Keep original if no mapping
  END CASE;
  
  RETURN normalized;
END;
$$;

-- Function to add/update pattern (when user consents)
CREATE OR REPLACE FUNCTION add_health_pattern(
  user_uuid UUID,
  symptom_text TEXT,
  trigger_text TEXT,
  frequency INTEGER DEFAULT 1
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  pattern_json JSONB;
  existing_patterns JSONB;
  pattern_exists BOOLEAN := false;
  pattern_index INT := -1;
BEGIN
  -- Get existing patterns
  SELECT patterns INTO existing_patterns
  FROM public.user_health_profiles
  WHERE user_id = user_uuid;
  
  -- Initialize if null
  IF existing_patterns IS NULL THEN
    existing_patterns := '[]'::jsonb;
  END IF;
  
  -- Check if pattern already exists (by symptom + trigger)
  FOR pattern_index IN 0..jsonb_array_length(existing_patterns) - 1 LOOP
    IF existing_patterns->pattern_index->>'symptom' = symptom_text 
       AND existing_patterns->pattern_index->>'trigger' = trigger_text THEN
      pattern_exists := true;
      EXIT;
    END IF;
  END LOOP;
  
  IF pattern_exists THEN
    -- Update existing pattern (increment frequency)
    existing_patterns := jsonb_set(
      existing_patterns,
      ARRAY[pattern_index::text, 'frequency'],
      to_jsonb((existing_patterns->pattern_index->>'frequency')::INTEGER + frequency),
      true
    );
    -- Update confirmed status and last_seen
    existing_patterns := jsonb_set(
      existing_patterns,
      ARRAY[pattern_index::text, 'confirmed'],
      'true'::jsonb,
      true
    );
    existing_patterns := jsonb_set(
      existing_patterns,
      ARRAY[pattern_index::text, 'last_seen_at'],
      to_jsonb(NOW()::text),
      true
    );
  ELSE
    -- Add new pattern
    pattern_json := jsonb_build_object(
      'symptom', symptom_text,
      'trigger', trigger_text,
      'frequency', frequency,
      'confirmed', true,
      'created_at', NOW()::text,
      'last_seen_at', NOW()::text
    );
    existing_patterns := existing_patterns || pattern_json;
  END IF;
  
  -- Update patterns in database
  UPDATE public.user_health_profiles
  SET 
    patterns = existing_patterns,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$;

-- Function to update consent status
CREATE OR REPLACE FUNCTION update_pattern_tracking_consent(
  user_uuid UUID,
  consent_given BOOLEAN
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_health_profiles
  SET 
    pattern_tracking_consent = consent_given,
    consent_given_at = CASE 
      WHEN consent_given THEN COALESCE(consent_given_at, NOW())
      ELSE consent_given_at
    END,
    consent_withdrawn_at = CASE 
      WHEN NOT consent_given THEN NOW()
      ELSE consent_withdrawn_at
    END,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$;

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_health_profile_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_health_profile_updated_at ON public.user_health_profiles;

CREATE TRIGGER trigger_update_health_profile_updated_at
  BEFORE UPDATE ON public.user_health_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_health_profile_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Uncomment to verify table creation:
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_health_profiles' 
-- ORDER BY ordinal_position;

-- Uncomment to verify indexes:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'user_health_profiles';

-- Uncomment to verify RLS policies:
-- SELECT policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'user_health_profiles';

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================

