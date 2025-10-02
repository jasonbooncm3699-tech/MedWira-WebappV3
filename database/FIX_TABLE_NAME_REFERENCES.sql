-- CRITICAL FIX: Update all functions to use correct table name 'profiles'
-- The table is called 'public.profiles', not 'public.user_profiles'

-- Update the provisioning function to use the correct table name 'profiles'
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
    )
    VALUES (
        NEW.id, 
        30, -- CRITICAL FIX: Explicitly set the token count to 30
        new_referral_code, 
        0,  -- Initial referral count
        NULL, -- No referring user initially
        COALESCE(NEW.raw_user_meta_data->>'full_name', 
                 NEW.raw_user_meta_data->>'name',
                 NEW.raw_user_meta_data->>'user_name',
                 SPLIT_PART(NEW.email, '@', 1),
                 'User'), -- Display name from metadata
        NEW.raw_user_meta_data->>'avatar_url', -- Avatar URL from metadata
        NOW(),
        NOW()
    );
    
    -- The function must return NEW for the trigger to complete successfully.
    RETURN NEW;
END;
$$;

-- Update the manual provisioning function to use the correct table name 'profiles'
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

-- Update the get_user_profile_by_referral_code function
CREATE OR REPLACE FUNCTION public.get_user_profile_by_referral_code(referral_code_param TEXT)
RETURNS TABLE(
    id UUID,
    token_count INTEGER,
    referral_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.token_count, p.referral_count
    FROM public.profiles p
    WHERE p.referral_code = referral_code_param;
END;
$$ LANGUAGE plpgsql;

-- Update the update_user_token_count function
CREATE OR REPLACE FUNCTION public.update_user_token_count(
    user_id UUID,
    token_change INTEGER
)
RETURNS JSON AS $$
DECLARE
    current_tokens INTEGER;
    new_tokens INTEGER;
    result JSON;
BEGIN
    -- Get current token count from profiles table
    SELECT token_count INTO current_tokens 
    FROM public.profiles 
    WHERE id = user_id;
    
    -- Calculate new token count
    new_tokens := GREATEST(0, current_tokens + token_change);
    
    -- Update token count in profiles table
    UPDATE public.profiles 
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
GRANT EXECUTE ON FUNCTION public.handle_new_user_provisioning() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_profile_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_token_count(UUID, INTEGER) TO authenticated;

-- Verify the functions exist and are accessible
SELECT 
    routine_name, 
    routine_type, 
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user_provisioning', 'provision_user_profile_manually', 'get_user_profile_by_referral_code', 'update_user_token_count')
    AND routine_schema = 'public';
