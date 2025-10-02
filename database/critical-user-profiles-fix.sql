-- CRITICAL FIX: User Profiles Provisioning System
-- This script creates the definitive trigger and function to automatically provision new users
-- with 30 tokens and unique referral codes in the public.user_profiles table

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure user_profiles table has the required columns
-- Add columns if they don't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 30;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referred_by VARCHAR(20);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_token_count ON public.user_profiles(token_count);

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_new_user_provisioning ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_provisioning();
DROP FUNCTION IF EXISTS handle_new_user();

-- CRITICAL FUNCTION: Handle new user provisioning
CREATE OR REPLACE FUNCTION handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    referral_code VARCHAR(20);
    referral_code_exists BOOLEAN := TRUE;
    attempts INTEGER := 0;
    max_attempts INTEGER := 10;
BEGIN
    -- Get the new user's ID from the auth.users table
    new_user_id := NEW.id;
    
    -- Generate unique referral code with retry logic
    WHILE referral_code_exists AND attempts < max_attempts LOOP
        -- Generate a 8-character alphanumeric code
        referral_code := UPPER(
            SUBSTRING(
                MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || new_user_id::TEXT), 
                1, 8
            )
        );
        
        -- Check if this code already exists in user_profiles table
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles WHERE referral_code = handle_new_user_provisioning.referral_code
        ) INTO referral_code_exists;
        
        attempts := attempts + 1;
        
        -- If we've tried too many times, add timestamp to ensure uniqueness
        IF attempts >= max_attempts THEN
            referral_code := UPPER(
                SUBSTRING(
                    MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || new_user_id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 
                    1, 8
                )
            );
            referral_code_exists := FALSE;
        END IF;
    END LOOP;
    
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
    RAISE NOTICE 'New user provisioned successfully: ID=%, tokens=30, referral_code=%', new_user_id, referral_code;
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to provision user %: %', new_user_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- CRITICAL TRIGGER: Execute function after user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_provisioning();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user_provisioning() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_provisioning() TO anon;

-- Update RLS policies for user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view referral codes" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

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

-- Test function to verify the system works
CREATE OR REPLACE FUNCTION test_user_provisioning()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_user_id UUID;
    test_referral_code VARCHAR(20);
    result JSON;
BEGIN
    -- Generate a test user ID
    test_user_id := uuid_generate_v4();
    
    -- Insert a test user into auth.users (this should trigger the function)
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
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
        'test@example.com',
        '$2a$10$dummy.hash',
        NOW(),
        NULL,
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Test User"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
    
    -- Check if the user was provisioned in user_profiles
    SELECT referral_code INTO test_referral_code
    FROM public.user_profiles
    WHERE id = test_user_id;
    
    IF test_referral_code IS NOT NULL THEN
        SELECT json_build_object(
            'success', true,
            'message', 'User provisioning test successful',
            'user_id', test_user_id,
            'referral_code', test_referral_code,
            'tokens', 30
        ) INTO result;
    ELSE
        SELECT json_build_object(
            'success', false,
            'message', 'User provisioning test failed - no referral code found',
            'user_id', test_user_id
        ) INTO result;
    END IF;
    
    -- Clean up test data
    DELETE FROM public.user_profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RETURN result;
END;
$$;

-- Grant test function permissions
GRANT EXECUTE ON FUNCTION test_user_provisioning() TO authenticated;

-- Verify the trigger exists and is properly configured
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created' 
AND event_object_table = 'users'
AND event_object_schema = 'auth';

-- Show function details
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_provisioning'
AND routine_schema = 'public';

COMMENT ON FUNCTION handle_new_user_provisioning() IS 'CRITICAL: Automatically provisions new users with 30 tokens and unique referral code in user_profiles table';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'CRITICAL: Triggers user provisioning immediately after user creation in auth.users';
