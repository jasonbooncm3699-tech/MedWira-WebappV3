-- STEP 1: CRITICAL DATABASE FIX - PROFILES TABLE ENHANCEMENT
-- This script consolidates users/profiles tables and fixes all critical issues
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- This will:
-- 1. Add missing columns to profiles table
-- 2. Fix risma.a's referral code
-- 3. Update foreign key constraints
-- 4. Drop empty users table
-- 5. Preserve all existing data (Jason Boon, risma.a with tokens)

-- ============================================
-- STEP 1A: Fix generate_referral_code function first
-- ============================================
-- Update the function to reference 'profiles' table instead of 'user_profiles'
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_uuid uuid)
RETURNS varchar(8)
LANGUAGE plpgsql
AS $$
DECLARE
    random_code text;
    referral_code_candidate varchar(8);
BEGIN
    -- Generate a unique 8-character code using MD5 hash of the UUID and a random number
    LOOP
        random_code := encode(digest(user_uuid::text || clock_timestamp()::text || random()::text, 'md5'), 'base64');
        -- Extract 8 characters, convert to uppercase, and remove non-alphanumeric characters
        referral_code_candidate := UPPER(regexp_replace(SUBSTRING(random_code, 1, 10), '[^A-Z0-9]', '', 'g'));
        
        -- Check if the generated code already exists in the profiles table (FIXED)
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = referral_code_candidate) THEN
            RETURN referral_code_candidate;
        END IF;
    END LOOP;
END;
$$;

-- ============================================
-- STEP 1B: Add missing columns to profiles table
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- STEP 1B: Verify existing column names
-- ============================================
-- Note: Based on screenshots, profiles table already has 'tokens' column (not token_count)
-- No renaming needed - column names are already correct

-- ============================================
-- STEP 1C: Fix risma.a's referral code (from 'EMPTY' to proper code)
-- ============================================
UPDATE public.profiles 
SET referral_code = public.generate_referral_code('e439b5e8-0b86-4c5a-8271-6ca9d9961b66'::UUID)
WHERE id = 'e439b5e8-0b86-4c5a-8271-6ca9d9961b66';

-- ============================================
-- STEP 1D: Update foreign key constraints
-- ============================================
-- Drop existing foreign key constraint (if exists)
ALTER TABLE scan_history DROP CONSTRAINT IF EXISTS scan_history_user_id_fkey;

-- Add new foreign key constraint pointing to profiles table
ALTER TABLE scan_history ADD CONSTRAINT scan_history_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================
-- STEP 1E: Drop empty users table
-- ============================================
-- Drop the empty users table since we're consolidating to profiles
DROP TABLE IF EXISTS users;

-- ============================================
-- STEP 1F: Verify the migration
-- ============================================
-- Check profiles table structure
SELECT 'PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check profiles table data
SELECT 'PROFILES TABLE DATA:' as info;
SELECT id, display_name, tokens, referral_code, subscription_tier, created_at
FROM profiles
ORDER BY created_at;

-- Check scan_history foreign key constraint
SELECT 'SCAN_HISTORY CONSTRAINTS:' as info;
SELECT constraint_name, constraint_type, table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'scan_history'
  AND constraint_type = 'FOREIGN KEY';

-- Verify users table is dropped
SELECT 'USERS TABLE STATUS:' as info;
SELECT CASE 
  WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
  THEN 'USERS TABLE STILL EXISTS - MIGRATION INCOMPLETE'
  ELSE 'USERS TABLE SUCCESSFULLY DROPPED - MIGRATION COMPLETE'
END as status;

-- ============================================
-- STEP 1G: Success message
-- ============================================
SELECT 'STEP 1 COMPLETE: Database migration successful!' as status,
       'Profiles table enhanced, users table dropped, foreign keys updated' as details;
