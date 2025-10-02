-- SIMPLE FIX: Update provision_user_profile_manually function for profiles table
-- Run this single function to fix the table name issue

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
        FROM public.profiles 
        WHERE referral_code = referral_code_param;
        
        -- If referring user found, update their referral count
        IF referred_by_user_id IS NOT NULL THEN
            UPDATE public.profiles 
            SET referral_count = referral_count + 1,
                updated_at = NOW()
            WHERE id = referred_by_user_id;
        END IF;
    END IF;
    
    -- Insert or update user record in profiles table
    INSERT INTO public.profiles (
        id,
        token_count,
        referral_code,
        referral_count,
        referred_by,
        display_name,
        avatar_url,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        30, -- Welcome tokens
        new_referral_code,
        0, -- Initial referral count
        referral_code_param,
        user_name,
        NULL, -- Avatar URL will be set by the application
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW(),
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        -- Only update token_count if user has 0 tokens (new user)
        token_count = CASE 
            WHEN profiles.token_count = 0 OR profiles.token_count IS NULL THEN 30 
            ELSE profiles.token_count 
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
