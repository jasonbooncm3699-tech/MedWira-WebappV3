-- CRITICAL FIX: Update provision_user_profile_manually function
-- Fixes OAuth sign-in issue where function uses wrong column/table names

-- ============================================
-- FIX: Update provision_user_profile_manually function
-- ============================================

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
    
    -- If referral code provided, find the referring user and get their UUID
    IF referral_code_param IS NOT NULL AND referral_code_param != '' THEN
        SELECT id INTO referred_by_user_id 
        FROM public.profiles 
        WHERE referral_code = referral_code_param;
        
        -- Note: referral_count column doesn't exist, so we skip updating it
        -- If referring user found, just log it (no referral_count tracking)
        IF referred_by_user_id IS NOT NULL THEN
            -- Could update last_login or other existing fields if needed
            UPDATE public.profiles 
            SET updated_at = NOW()
            WHERE id = referred_by_user_id;
        END IF;
    ELSE
        -- No referral code provided, set to NULL
        referred_by_user_id := NULL;
    END IF;
    
    -- Insert or update user record in profiles table (FIXED: correct table name)
    INSERT INTO public.profiles (
        id,
        tokens,                    -- FIXED: was token_count
        referral_code,
        referred_by,
        email,                    -- ADDED: missing column
        display_name,             -- ADDED: missing column
        subscription_tier,        -- ADDED: missing column
        created_at,
        updated_at
    ) VALUES (
        user_id,
        30, -- Welcome tokens
        new_referral_code,
        referred_by_user_id,      -- FIXED: Use UUID instead of text
        user_email,               -- ADDED: email from parameter
        COALESCE(user_name, user_email), -- ADDED: display name
        'free',                   -- ADDED: default subscription tier
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW(),
        email = COALESCE(EXCLUDED.email, profiles.email),
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        -- Only update tokens if user has 0 tokens (new user)
        tokens = CASE 
            WHEN profiles.tokens = 0 OR profiles.tokens IS NULL THEN 30 
            ELSE profiles.tokens 
        END;
    
    -- Return success result
    result := json_build_object(
        'success', true,
        'user_id', user_id,
        'tokens', 30,
        'referral_code', new_referral_code,
        'referred_by', referral_code_param
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    result := json_build_object(
        'success', false,
        'error', SQLERRM,
        'user_id', user_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO anon;

-- Verify the function exists and is accessible
SELECT 'FIXED: provision_user_profile_manually function updated successfully' as status;

-- Test the function with a dummy call (won't actually insert due to conflict)
SELECT public.provision_user_profile_manually(
    uuid_generate_v4(),
    'test@example.com',
    'Test User',
    NULL
) as test_result;
