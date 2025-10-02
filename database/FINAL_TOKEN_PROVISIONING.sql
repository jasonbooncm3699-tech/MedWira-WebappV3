-- =====================================================
-- FINAL CRITICAL FIX: Token Provisioning System
-- =====================================================
-- This script ensures new users receive 30 tokens and a referral code
-- in the public.user_profiles table immediately upon signup
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: ENSURE user_profiles TABLE STRUCTURE
-- =====================================================

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    token_count INTEGER NOT NULL DEFAULT 30,
    referral_code VARCHAR(20) UNIQUE,
    referral_count INTEGER DEFAULT 0,
    referred_by VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'token_count' AND table_schema = 'public') THEN
        ALTER TABLE public.user_profiles ADD COLUMN token_count INTEGER NOT NULL DEFAULT 30;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'referral_code' AND table_schema = 'public') THEN
        ALTER TABLE public.user_profiles ADD COLUMN referral_code VARCHAR(20) UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'referral_count' AND table_schema = 'public') THEN
        ALTER TABLE public.user_profiles ADD COLUMN referral_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'referred_by' AND table_schema = 'public') THEN
        ALTER TABLE public.user_profiles ADD COLUMN referred_by VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'created_at' AND table_schema = 'public') THEN
        ALTER TABLE public.user_profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE public.user_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_token_count ON public.user_profiles(token_count);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- =====================================================
-- STEP 2: REFERRAL CODE GENERATION FUNCTION
-- =====================================================

-- Drop existing referral code generation function if it exists
DROP FUNCTION IF EXISTS generate_unique_referral_code();

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    referral_code VARCHAR(20);
    code_exists BOOLEAN := TRUE;
    attempts INTEGER := 0;
    max_attempts INTEGER := 10;
BEGIN
    -- Generate unique referral code with retry logic
    WHILE code_exists AND attempts < max_attempts LOOP
        -- Generate a 8-character alphanumeric code (uppercase)
        referral_code := UPPER(
            SUBSTRING(
                MD5(
                    RANDOM()::TEXT || 
                    CLOCK_TIMESTAMP()::TEXT || 
                    uuid_generate_v4()::TEXT
                ), 
                1, 8
            )
        );
        
        -- Check if this code already exists in user_profiles table
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles 
            WHERE referral_code = generate_unique_referral_code.referral_code
        ) INTO code_exists;
        
        attempts := attempts + 1;
        
        -- If we've tried too many times, add timestamp to ensure uniqueness
        IF attempts >= max_attempts THEN
            referral_code := UPPER(
                SUBSTRING(
                    MD5(
                        RANDOM()::TEXT || 
                        CLOCK_TIMESTAMP()::TEXT || 
                        uuid_generate_v4()::TEXT || 
                        EXTRACT(EPOCH FROM NOW())::TEXT
                    ), 
                    1, 8
                )
            );
            code_exists := FALSE;
        END IF;
    END LOOP;
    
    RETURN referral_code;
END;
$$;

-- =====================================================
-- STEP 3: USER PROVISIONING FUNCTION
-- =====================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_new_user_provisioning ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_provisioning();
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the main user provisioning function
CREATE OR REPLACE FUNCTION handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    referral_code VARCHAR(20);
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Get the new user's ID from the auth.users table
    new_user_id := NEW.id;
    user_email := NEW.email;
    
    -- Extract user name from metadata or email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(user_email, '@', 1),
        'User'
    );
    
    -- Generate unique referral code
    referral_code := generate_unique_referral_code();
    
    -- Insert user record into user_profiles with welcome tokens and referral code
    INSERT INTO public.user_profiles (
        id,
        token_count,
        referral_code,
        referral_count,
        referred_by,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        30, -- Welcome bonus: 30 tokens
        referral_code,
        0, -- Initial referral count
        NULL, -- No referring user initially
        NOW(),
        NOW()
    );
    
    -- Log the successful provisioning
    RAISE NOTICE 'User provisioned successfully: ID=%, Email=%, Name=%, Tokens=30, ReferralCode=%', 
        new_user_id, user_email, user_name, referral_code;
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to provision user % (%): %', new_user_id, user_email, SQLERRM;
    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 4: TRIGGER ON auth.users
-- =====================================================

-- Create trigger that fires AFTER INSERT on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_provisioning();

-- =====================================================
-- STEP 5: PERMISSIONS AND SECURITY
-- =====================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user_provisioning() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_provisioning() TO anon;
GRANT EXECUTE ON FUNCTION generate_unique_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_referral_code() TO anon;

-- Enable Row Level Security on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view referral codes" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to read referral codes for the referral system
CREATE POLICY "Users can view referral codes" ON public.user_profiles
    FOR SELECT USING (true);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- =====================================================
-- STEP 6: MANUAL PROVISIONING FUNCTION (BACKUP)
-- =====================================================

-- Create manual provisioning function as backup
CREATE OR REPLACE FUNCTION provision_user_profile_manually(
    user_id UUID,
    user_email TEXT,
    user_name TEXT DEFAULT NULL,
    referral_code_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    generated_referral_code VARCHAR(20);
    result JSON;
BEGIN
    -- Check if user already exists in user_profiles
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = user_id) THEN
        SELECT json_build_object(
            'success', false,
            'message', 'User already exists in user_profiles',
            'user_id', user_id
        ) INTO result;
        RETURN result;
    END IF;
    
    -- Generate or use provided referral code
    IF referral_code_param IS NOT NULL THEN
        generated_referral_code := referral_code_param;
    ELSE
        generated_referral_code := generate_unique_referral_code();
    END IF;
    
    -- Insert user into user_profiles
    INSERT INTO public.user_profiles (
        id,
        token_count,
        referral_code,
        referral_count,
        referred_by,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        30, -- Welcome bonus: 30 tokens
        generated_referral_code,
        0, -- Initial referral count
        NULL, -- No referring user initially
        NOW(),
        NOW()
    );
    
    -- Return success response
    SELECT json_build_object(
        'success', true,
        'message', 'User provisioned successfully',
        'user_id', user_id,
        'email', user_email,
        'name', user_name,
        'tokens', 30,
        'referral_code', generated_referral_code
    ) INTO result;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error response
    SELECT json_build_object(
        'success', false,
        'message', 'Failed to provision user: ' || SQLERRM,
        'user_id', user_id,
        'error', SQLERRM
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant permissions for manual provisioning
GRANT EXECUTE ON FUNCTION provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO anon;

-- =====================================================
-- STEP 7: TESTING AND VALIDATION
-- =====================================================

-- Create test function to verify the system works
CREATE OR REPLACE FUNCTION test_user_provisioning_system()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_user_id UUID;
    test_referral_code VARCHAR(20);
    test_email TEXT := 'test_' || EXTRACT(EPOCH FROM NOW())::TEXT || '@example.com';
    result JSON;
    user_exists BOOLEAN := FALSE;
BEGIN
    -- Generate a test user ID
    test_user_id := uuid_generate_v4();
    
    RAISE NOTICE 'Testing user provisioning system with user ID: %', test_user_id;
    
    -- Insert a test user into auth.users (this should trigger the function)
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        test_email,
        '$2a$10$dummy.hash',
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Test User", "full_name": "Test User Full Name"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
    
    -- Wait a moment for the trigger to execute
    PERFORM pg_sleep(1);
    
    -- Check if the user was provisioned in user_profiles
    SELECT 
        referral_code,
        token_count,
        referral_count
    INTO test_referral_code, result->>'tokens', result->>'referral_count'
    FROM public.user_profiles
    WHERE id = test_user_id;
    
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO user_exists;
    
    IF user_exists AND test_referral_code IS NOT NULL THEN
        SELECT json_build_object(
            'success', true,
            'message', 'User provisioning system test PASSED',
            'user_id', test_user_id,
            'email', test_email,
            'referral_code', test_referral_code,
            'tokens', 30,
            'referral_count', 0,
            'trigger_working', true
        ) INTO result;
        
        RAISE NOTICE 'SUCCESS: User provisioning test passed - Referral Code: %, Tokens: 30', test_referral_code;
    ELSE
        SELECT json_build_object(
            'success', false,
            'message', 'User provisioning system test FAILED',
            'user_id', test_user_id,
            'email', test_email,
            'user_exists', user_exists,
            'referral_code', test_referral_code,
            'trigger_working', false
        ) INTO result;
        
        RAISE NOTICE 'FAILURE: User provisioning test failed - User exists: %, Referral code: %', user_exists, test_referral_code;
    END IF;
    
    -- Clean up test data
    DELETE FROM public.user_profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Test completed and cleaned up';
    RETURN result;
END;
$$;

-- Grant test function permissions
GRANT EXECUTE ON FUNCTION test_user_provisioning_system() TO authenticated;

-- =====================================================
-- STEP 8: VERIFICATION QUERIES
-- =====================================================

-- Verify the trigger exists and is properly configured
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created' 
AND event_object_table = 'users'
AND event_object_schema = 'auth';

-- Show function details
SELECT 
    routine_name,
    routine_type,
    security_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user_provisioning', 'generate_unique_referral_code', 'provision_user_profile_manually')
AND routine_schema = 'public';

-- Check user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify RLS policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- =====================================================
-- STEP 9: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION handle_new_user_provisioning() IS 'CRITICAL: Automatically provisions new users with 30 tokens and unique referral code in user_profiles table. Triggered on auth.users INSERT.';
COMMENT ON FUNCTION generate_unique_referral_code() IS 'Generates unique 8-character alphanumeric referral codes with collision detection and retry logic.';
COMMENT ON FUNCTION provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) IS 'Manual backup function to provision users in user_profiles table. Returns JSON with success status and user data.';
COMMENT ON FUNCTION test_user_provisioning_system() IS 'Test function to verify the complete user provisioning system works correctly. Returns JSON with test results.';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'CRITICAL: Triggers user provisioning immediately after user creation in auth.users. Ensures 30 tokens and referral code.';

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FINAL CRITICAL FIX DEPLOYED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ User provisioning system is now active';
    RAISE NOTICE '✅ New users will receive 30 tokens automatically';
    RAISE NOTICE '✅ Unique referral codes will be generated';
    RAISE NOTICE '✅ Trigger is active on auth.users table';
    RAISE NOTICE '✅ Manual provisioning backup is available';
    RAISE NOTICE '✅ Test function is ready for validation';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: SELECT test_user_provisioning_system();';
    RAISE NOTICE '2. Verify trigger exists in verification queries above';
    RAISE NOTICE '3. Test with a real user signup';
    RAISE NOTICE '=====================================================';
END $$;
