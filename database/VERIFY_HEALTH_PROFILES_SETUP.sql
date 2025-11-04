-- ============================================================================
-- Phase 1 Verification Script
-- Run this in Supabase SQL Editor to verify Phase 1 setup
-- ============================================================================

-- ============================================================================
-- 1. Verify Table Exists
-- ============================================================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'user_health_profiles';

-- Expected: Should return 1 row with table_name = 'user_health_profiles'

-- ============================================================================
-- 2. Verify Table Columns
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_health_profiles'
ORDER BY ordinal_position;

-- Expected: Should show all columns: id, user_id, age, sex, symptoms[], etc.

-- ============================================================================
-- 3. Verify Indexes
-- ============================================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'user_health_profiles'
ORDER BY indexname;

-- Expected: Should show indexes:
-- idx_user_health_profiles_user_id
-- idx_user_health_profiles_symptoms (GIN)
-- idx_user_health_profiles_conditions (GIN)
-- idx_user_health_profiles_medications (GIN)
-- idx_user_health_profiles_triggers (GIN)
-- idx_user_health_profiles_known_conditions (GIN)
-- idx_user_health_profiles_patterns (GIN)
-- idx_user_health_profiles_age

-- ============================================================================
-- 4. Verify Functions
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%health%'
ORDER BY routine_name;

-- Expected: Should show functions:
-- add_health_pattern
-- initialize_user_health_profile
-- update_health_keywords
-- update_health_profile_updated_at (trigger function)
-- update_personal_details
-- update_pattern_tracking_consent

-- Also check for other functions:
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%pattern%' 
    OR routine_name LIKE '%personal%'
    OR routine_name = 'normalize_condition_name')
ORDER BY routine_name;

-- Expected: Should show:
-- add_health_pattern
-- normalize_condition_name
-- update_personal_details
-- update_pattern_tracking_consent

-- ============================================================================
-- 5. Verify RLS Policies
-- ============================================================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_health_profiles'
ORDER BY policyname;

-- Expected: Should show policies:
-- "Users can view own health profile" (SELECT)
-- "Users can update own health profile" (UPDATE)
-- "Allow health profile creation" (INSERT)
-- "Service role can manage health profiles" (ALL)

-- ============================================================================
-- 6. Verify Triggers
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table = 'user_health_profiles';

-- Expected: Should show trigger:
-- trigger_update_health_profile_updated_at (BEFORE UPDATE)

-- ============================================================================
-- 7. Verify Foreign Key Constraint
-- ============================================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_health_profiles';

-- Expected: Should show foreign key:
-- user_id references profiles(id)

-- ============================================================================
-- 8. Verify Unique Constraint
-- ============================================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name = 'user_health_profiles';

-- Expected: Should show unique constraint on user_id

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================
-- After running all queries above, verify:
-- ✅ Table exists
-- ✅ All columns present
-- ✅ All indexes created (8 indexes)
-- ✅ All functions exist (6 functions minimum)
-- ✅ RLS policies active (4 policies minimum)
-- ✅ Trigger exists (1 trigger)
-- ✅ Foreign key constraint exists
-- ✅ Unique constraint exists

-- If any are missing, check the CREATE_USER_HEALTH_PROFILES.sql script
-- and re-run the missing parts.

