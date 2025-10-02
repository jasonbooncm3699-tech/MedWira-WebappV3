-- MedWira AI - User Profiles Provisioning System
-- This script creates triggers and functions to automatically provision new users
-- with 30 welcome tokens and unique referral codes in the public.user_profiles table

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

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate a 8-character alphanumeric code
        code := UPPER(
            SUBSTRING(
                MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 
                1, 8
            )
        );
        
        -- Check if this code already exists in user_profiles table
        SELECT COUNT(*) INTO exists_count 
        FROM public.user_profiles 
        WHERE referral_code = code;
        
        -- If code doesn't exist, we can use it
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user provisioning in user_profiles table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    referral_code VARCHAR(20);
    referred_by_code VARCHAR(20) := NULL;
    referring_user_id UUID := NULL;
BEGIN
    -- Get the new user's ID from the auth.users table
    new_user_id := NEW.id;
    
    -- Generate unique referral code
    referral_code := generate_referral_code();
    
    -- Check if there's a referral parameter in the signup
    -- This would be handled by the application when creating the user record
    -- For now, we'll set it to NULL and let the application handle referrals
    
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
        referred_by_code,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW();
    
    -- If user was referred, update the referring user's referral count
    IF referred_by_code IS NOT NULL THEN
        UPDATE public.user_profiles 
        SET referral_count = referral_count + 1,
            updated_at = NOW()
        WHERE referral_code = referred_by_code;
    END IF;
    
    -- Log the successful provisioning
    RAISE NOTICE 'New user provisioned: ID=%, tokens=30, referral_code=%', new_user_id, referral_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table for new user provisioning
DROP TRIGGER IF EXISTS trigger_new_user_provisioning ON auth.users;
CREATE TRIGGER trigger_new_user_provisioning
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Alternative function for manual user provisioning (used by auth callback)
CREATE OR REPLACE FUNCTION provision_user_profile_manually(
    user_id UUID,
    user_email TEXT,
    user_name TEXT DEFAULT NULL,
    referral_code_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_referral_code VARCHAR(20);
    referred_by_user_id UUID := NULL;
    result JSON;
BEGIN
    -- Generate unique referral code for new user
    new_referral_code := generate_referral_code();
    
    -- If referral code provided, find the referring user
    IF referral_code_param IS NOT NULL AND referral_code_param != '' THEN
        SELECT id INTO referred_by_user_id 
        FROM public.user_profiles 
        WHERE referral_code = referral_code_param;
        
        -- If referring user found, update their referral count
        IF referred_by_user_id IS NOT NULL THEN
            UPDATE public.user_profiles 
            SET referral_count = referral_count + 1,
                updated_at = NOW()
            WHERE id = referred_by_user_id;
        END IF;
    END IF;
    
    -- Insert or update user record in user_profiles table
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
        30, -- Welcome tokens
        new_referral_code,
        0, -- Initial referral count
        referral_code_param,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW(),
        -- Only update token_count if user has 0 tokens (new user)
        token_count = CASE 
            WHEN public.user_profiles.token_count = 0 THEN 30 
            ELSE public.user_profiles.token_count 
        END;
    
    -- Return success result
    SELECT json_build_object(
        'success', true,
        'user_id', user_id,
        'referral_code', new_referral_code,
        'token_count', 30,
        'referred_by', referral_code_param
    ) INTO result;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    SELECT json_build_object(
        'success', false,
        'error', SQLERRM
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user by referral code from user_profiles
CREATE OR REPLACE FUNCTION get_user_profile_by_referral_code(referral_code_param TEXT)
RETURNS TABLE(
    id UUID,
    token_count INTEGER,
    referral_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT up.id, up.token_count, up.referral_count
    FROM public.user_profiles up
    WHERE up.referral_code = referral_code_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update user token count in user_profiles
CREATE OR REPLACE FUNCTION update_user_token_count(
    user_id UUID,
    token_change INTEGER
)
RETURNS JSON AS $$
DECLARE
    current_tokens INTEGER;
    new_tokens INTEGER;
    result JSON;
BEGIN
    -- Get current token count from user_profiles
    SELECT token_count INTO current_tokens 
    FROM public.user_profiles 
    WHERE id = user_id;
    
    -- Calculate new token count
    new_tokens := GREATEST(0, current_tokens + token_change);
    
    -- Update token count in user_profiles
    UPDATE public.user_profiles 
    SET token_count = new_tokens,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Return result
    SELECT json_build_object(
        'success', true,
        'user_id', user_id,
        'previous_tokens', current_tokens,
        'new_tokens', new_tokens,
        'token_change', token_change
    ) INTO result;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    SELECT json_build_object(
        'success', false,
        'error', SQLERRM
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_by_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_token_count(UUID, INTEGER) TO authenticated;

-- Update RLS policies for user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view referral codes" ON public.user_profiles;

-- Create new RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to read referral codes (for referral system)
CREATE POLICY "Users can view referral codes" ON public.user_profiles
    FOR SELECT USING (true);

-- Test the system (commented out for production)
-- SELECT provision_user_profile_manually(
--     uuid_generate_v4(),
--     'test@example.com',
--     'Test User',
--     NULL
-- );

-- Verify the trigger works (commented out for production)
-- INSERT INTO auth.users (id, email, raw_user_meta_data) 
-- VALUES (uuid_generate_v4(), 'trigger_test@example.com', '{"name": "Trigger Test User"}');

COMMENT ON FUNCTION generate_referral_code() IS 'Generates a unique 8-character alphanumeric referral code for user_profiles table';
COMMENT ON FUNCTION handle_new_user() IS 'Trigger function that automatically provisions new users with 30 tokens and referral code in user_profiles table';
COMMENT ON FUNCTION provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) IS 'Manually provisions a user with welcome tokens and referral code in user_profiles table';
COMMENT ON FUNCTION get_user_profile_by_referral_code(TEXT) IS 'Retrieves user profile information by referral code from user_profiles table';
COMMENT ON FUNCTION update_user_token_count(UUID, INTEGER) IS 'Updates user token count with change amount in user_profiles table';
