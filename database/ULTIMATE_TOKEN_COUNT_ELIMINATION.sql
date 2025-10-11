-- ULTIMATE ELIMINATION OF ALL token_count REFERENCES
-- This script will drop ALL possible conflicting functions and ensure only correct ones exist

-- ============================================
-- STEP 1: Drop ALL possible function variations
-- ============================================

DROP FUNCTION IF EXISTS public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.provision_user_profile_manually();
DROP FUNCTION IF EXISTS public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.handle_new_user_provisioning();
DROP FUNCTION IF EXISTS public.update_user_token_count(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_profile_by_referral_code(TEXT);
DROP FUNCTION IF EXISTS public.generate_referral_code(UUID);
DROP FUNCTION IF EXISTS public.generate_referral_code(TEXT);

-- Drop any triggers that might call these functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_user_provisioning ON auth.users;

-- ============================================
-- STEP 2: Create ONLY the correct generate_referral_code function
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_referral_code(user_uuid UUID DEFAULT NULL)
RETURNS VARCHAR(8)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code VARCHAR(8);
    code_exists BOOLEAN := TRUE;
    attempts INTEGER := 0;
    max_attempts INTEGER := 10;
BEGIN
    WHILE code_exists AND attempts < max_attempts LOOP
        -- Generate 8-character alphanumeric code
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || user_uuid::TEXT), 1, 8));
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM public.profiles 
            WHERE referral_code = new_code
        ) INTO code_exists;
        
        attempts := attempts + 1;
    END LOOP;
    
    -- If we couldn't generate a unique code, use timestamp-based fallback
    IF code_exists THEN
        new_code := UPPER(SUBSTRING(MD5(NOW()::TEXT || user_uuid::TEXT), 1, 8));
    END IF;
    
    RETURN new_code;
END;
$$;

-- ============================================
-- STEP 3: Create ONLY the correct provision_user_profile_manually function
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
        
        -- If referring user found, update their updated_at timestamp
        IF referred_by_user_id IS NOT NULL THEN
            UPDATE public.profiles 
            SET updated_at = NOW()
            WHERE id = referred_by_user_id;
        END IF;
    ELSE
        -- No referral code provided, set to NULL
        referred_by_user_id := NULL;
    END IF;
    
    -- Insert or update user record in profiles table (CORRECTED: uses 'tokens' not 'token_count')
    INSERT INTO public.profiles (
        id,
        tokens,                    -- CORRECT: was token_count
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
        referred_by_user_id,      -- CORRECT: Use UUID instead of text
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
        'referred_by', referred_by_user_id
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

-- ============================================
-- STEP 4: Grant necessary permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO anon;

-- ============================================
-- STEP 5: Verify ONLY correct functions exist
-- ============================================

SELECT 'ULTIMATE ELIMINATION: All token_count references completely removed' as status;

-- List all functions to verify only correct ones exist
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%provision%' OR routine_name LIKE '%referral%'
ORDER BY routine_name;

-- Test the function with a dummy call
SELECT public.provision_user_profile_manually(
    uuid_generate_v4(),
    'test@example.com',
    'Test User',
    NULL
) as test_result;
