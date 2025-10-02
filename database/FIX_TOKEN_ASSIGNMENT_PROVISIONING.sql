-- CRITICAL FIX: Token Assignment in User Provisioning Function
-- This script fixes the handle_new_user_provisioning function to explicitly set token_count to 30
-- instead of inserting NULL values

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update the provisioning function to explicitly set token_count to 30
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    new_referral_code VARCHAR(8);
BEGIN
    -- Generate the unique referral code by calling the function
    new_referral_code := public.generate_referral_code(NEW.id);

    -- Insert the new user's profile with initial tokens and the generated code
    INSERT INTO public.user_profiles (
        id, 
        token_count, 
        referral_code,
        referral_count,
        referred_by,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id, 
        30, -- <<< CRITICAL FIX: Explicitly set the token count to 30
        new_referral_code, 
        0,  -- Initial referral count
        NULL, -- No referring user initially
        NOW(),
        NOW()
    );
    
    -- The function must return NEW for the trigger to complete successfully.
    RETURN NEW;
END;
$$;

-- Also update the manual provisioning function to ensure it sets tokens correctly
CREATE OR REPLACE FUNCTION public.provision_user_profile_manually(
    user_id UUID,
    user_email TEXT,
    user_name TEXT DEFAULT NULL,
    referral_code_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_referral_code VARCHAR(8);
    referred_by_user_id UUID := NULL;
    result JSON;
BEGIN
    -- Generate unique referral code for new user
    new_referral_code := public.generate_referral_code(user_id);
    
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
        30, -- <<< CRITICAL FIX: Explicitly set welcome tokens to 30
        new_referral_code,
        0, -- Initial referral count
        referral_code_param,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW(),
        -- Only update token_count if user has 0 tokens (new user)
        token_count = CASE 
            WHEN public.user_profiles.token_count = 0 OR public.user_profiles.token_count IS NULL THEN 30 
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_provisioning() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user_provisioning() IS 'Trigger function that automatically provisions new users with 30 tokens and referral code (FIXED: explicitly sets token_count to 30)';
COMMENT ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) IS 'Manually provisions a user with 30 welcome tokens and referral code (FIXED: explicitly sets token_count to 30)';

-- Verify the functions exist and are accessible
SELECT 
    routine_name, 
    routine_type, 
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user_provisioning', 'provision_user_profile_manually')
    AND routine_schema = 'public';
