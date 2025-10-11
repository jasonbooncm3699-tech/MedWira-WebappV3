-- FIX: Create Missing provision_user_profile_manually Function
-- This fixes the sign-in issue where new users can't get their profiles created

-- ============================================
-- STEP 1: Create generate_referral_code function (if not exists)
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_referral_code(user_uuid UUID DEFAULT NULL)
RETURNS VARCHAR(8)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    random_code TEXT;
    final_code VARCHAR(8);
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 10;
BEGIN
    LOOP
        -- Generate random 8-character alphanumeric code
        random_code := encode(gen_random_bytes(4), 'hex');
        final_code := UPPER(SUBSTRING(random_code, 1, 8));
        
        -- Ensure exactly 8 characters
        IF LENGTH(final_code) < 8 THEN
            final_code := final_code || LPAD('', 8 - LENGTH(final_code), 'A');
        END IF;
        
        -- Check if this code already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE referral_code = final_code
        ) THEN
            RETURN final_code;
        END IF;
        
        -- Increment attempt counter
        attempt_count := attempt_count + 1;
        
        -- If we've tried too many times, add timestamp to make it unique
        IF attempt_count >= max_attempts THEN
            final_code := 'REF' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 5, '0');
            RETURN UPPER(SUBSTRING(final_code, 1, 8));
        END IF;
    END LOOP;
END;
$$;

-- ============================================
-- STEP 2: Create provision_user_profile_manually function
-- ============================================

CREATE OR REPLACE FUNCTION public.provision_user_profile_manually(
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
    new_referral_code VARCHAR(8);
    referred_by_user_id UUID := NULL;
    result JSON;
    user_display_name TEXT;
    user_avatar_url TEXT;
BEGIN
    -- Validate required parameters
    IF user_id IS NULL THEN
        SELECT json_build_object(
            'success', false,
            'error', 'user_id is required'
        ) INTO result;
        RETURN result;
    END IF;
    
    IF user_email IS NULL OR user_email = '' THEN
        SELECT json_build_object(
            'success', false,
            'error', 'user_email is required'
        ) INTO result;
        RETURN result;
    END IF;
    
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
        SELECT json_build_object(
            'success', true,
            'message', 'User already exists',
            'user_id', user_id,
            'action', 'existing_user'
        ) INTO result;
        RETURN result;
    END IF;
    
    -- Generate unique referral code
    new_referral_code := public.generate_referral_code(user_id);
    
    -- If referral code provided, find the referring user
    IF referral_code_param IS NOT NULL AND referral_code_param != '' THEN
        SELECT id INTO referred_by_user_id 
        FROM public.profiles 
        WHERE referral_code = referral_code_param;
        
        -- If referral code is invalid, ignore it
        IF referred_by_user_id IS NULL THEN
            referred_by_user_id := NULL;
        END IF;
    END IF;
    
    -- Set default display name if not provided
    user_display_name := COALESCE(user_name, user_email);
    
    -- Try to get avatar URL from auth.users metadata (for OAuth users)
    BEGIN
        SELECT 
            COALESCE(raw_user_meta_data->>'full_name', user_display_name) as display_name,
            raw_user_meta_data->>'avatar_url' as avatar_url
        INTO user_display_name, user_avatar_url
        FROM auth.users 
        WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
        -- If we can't get metadata, use defaults
        user_display_name := COALESCE(user_name, user_email);
        user_avatar_url := NULL;
    END;
    
    -- Insert new user profile
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        avatar_url,
        tokens,
        referral_code,
        referred_by,
        subscription_tier,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        user_display_name,
        user_avatar_url,
        30, -- Welcome tokens
        new_referral_code,
        referred_by_user_id,
        'free',
        NOW(),
        NOW()
    );
    
    -- If user was referred, increment referral count for referrer
    IF referred_by_user_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET referral_count = referral_count + 1,
            updated_at = NOW()
        WHERE id = referred_by_user_id;
    END IF;
    
    -- Return success response
    SELECT json_build_object(
        'success', true,
        'message', 'User provisioned successfully',
        'user_id', user_id,
        'email', user_email,
        'display_name', user_display_name,
        'referral_code', new_referral_code,
        'tokens', 30,
        'subscription_tier', 'free',
        'referred_by', referred_by_user_id
    ) INTO result;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error response
    SELECT json_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM,
        'user_id', user_id
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ============================================
-- STEP 3: Grant necessary permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO anon;

-- ============================================
-- STEP 4: Create trigger function for automatic user provisioning
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_display_name TEXT;
    user_avatar_url TEXT;
    new_referral_code VARCHAR(8);
BEGIN
    -- Extract display name and avatar from OAuth metadata
    user_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email
    );
    
    user_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Generate referral code
    new_referral_code := public.generate_referral_code(NEW.id);
    
    -- Insert into profiles table
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        avatar_url,
        tokens,
        referral_code,
        subscription_tier,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_display_name,
        user_avatar_url,
        30, -- Welcome tokens
        new_referral_code,
        'free',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Failed to provision user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- STEP 5: Create trigger (if not exists)
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_provisioning();

-- ============================================
-- STEP 6: Verification queries
-- ============================================

-- Check if functions exist
SELECT 'FUNCTION VERIFICATION:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines 
WHERE routine_name IN ('generate_referral_code', 'provision_user_profile_manually', 'handle_new_user_provisioning')
    AND routine_schema = 'public'
ORDER BY routine_name;

-- Test the provision function with a dummy call (won't actually insert)
SELECT 'TESTING PROVISION FUNCTION:' as info;
SELECT public.provision_user_profile_manually(
    uuid_generate_v4(),
    'test@example.com',
    'Test User',
    NULL
) as test_result;

-- Check current profiles table structure
SELECT 'PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check current user count
SELECT 'CURRENT USER COUNT:' as info;
SELECT COUNT(*) as total_users FROM public.profiles;

SELECT '✅ PROVISION FUNCTION SETUP COMPLETE!' as status;
