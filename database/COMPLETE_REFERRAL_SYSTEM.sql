-- COMPLETE REFERRAL SYSTEM IMPLEMENTATION
-- This script implements the missing referral reward system for token earning

-- 1. Add missing referral_count column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- 2. Create index for referral_count for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_count ON public.profiles(referral_count);

-- 3. Fix the generate_referral_code function to work with profiles table (not user_profiles)
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
        
        -- Check if the generated code already exists in the profiles table
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = referral_code_candidate) THEN
            RETURN referral_code_candidate;
        END IF;
    END LOOP;
END;
$$;

-- 4. Create function to process referral rewards when someone signs up
CREATE OR REPLACE FUNCTION public.process_referral_reward(
    new_user_id UUID,
    referral_code_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    referrer_user_id UUID := NULL;
    referrer_tokens_before INTEGER;
    referrer_tokens_after INTEGER;
    reward_tokens INTEGER := 5; -- Give 5 tokens per successful referral
    result JSON;
BEGIN
    -- If no referral code provided, just return success
    IF referral_code_param IS NULL OR referral_code_param = '' THEN
        RETURN json_build_object(
            'status', 'success',
            'message', 'No referral code provided',
            'referral_processed', false,
            'tokens_awarded', 0
        );
    END IF;
    
    -- Find the referrer by their referral code
    SELECT id, token_count INTO referrer_user_id, referrer_tokens_before
    FROM public.profiles 
    WHERE referral_code = referral_code_param;
    
    -- If referrer not found, return error
    IF referrer_user_id IS NULL THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Invalid referral code: ' || referral_code_param,
            'referral_processed', false,
            'tokens_awarded', 0
        );
    END IF;
    
    -- Prevent self-referral
    IF referrer_user_id = new_user_id THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Cannot refer yourself',
            'referral_processed', false,
            'tokens_awarded', 0
        );
    END IF;
    
    -- Update referrer's stats and award tokens
    UPDATE public.profiles 
    SET 
        referral_count = referral_count + 1,
        token_count = token_count + reward_tokens,
        updated_at = NOW()
    WHERE id = referrer_user_id
    RETURNING token_count INTO referrer_tokens_after;
    
    -- Update new user's referred_by field
    UPDATE public.profiles 
    SET 
        referred_by = referral_code_param,
        updated_at = NOW()
    WHERE id = new_user_id;
    
    -- Return success result
    RETURN json_build_object(
        'status', 'success',
        'message', 'Referral reward processed successfully',
        'referral_processed', true,
        'referrer_id', referrer_user_id,
        'referral_code', referral_code_param,
        'tokens_awarded', reward_tokens,
        'referrer_tokens_before', referrer_tokens_before,
        'referrer_tokens_after', referrer_tokens_after
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error if something goes wrong
    RETURN json_build_object(
        'status', 'error',
        'message', 'Database error: ' || SQLERRM,
        'referral_processed', false,
        'tokens_awarded', 0
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get referral statistics for a user
CREATE OR REPLACE FUNCTION public.get_referral_stats(user_id_param UUID)
RETURNS TABLE(
    referral_code TEXT,
    referral_count INTEGER,
    total_tokens_earned INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.referral_code,
        p.referral_count,
        (p.referral_count * 5) as total_tokens_earned -- 5 tokens per referral
    FROM public.profiles p
    WHERE p.id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_reward(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats(UUID) TO authenticated;

-- 7. Add comments for documentation
COMMENT ON FUNCTION public.generate_referral_code(uuid) IS 'Generates a unique 8-character alphanumeric referral code using UUID for profiles table';
COMMENT ON FUNCTION public.process_referral_reward(UUID, TEXT) IS 'Processes referral rewards when a new user signs up with a referral code. Awards 5 tokens to the referrer.';
COMMENT ON FUNCTION public.get_referral_stats(UUID) IS 'Returns referral statistics for a user including referral count and total tokens earned';

-- 8. Test the functions
-- Test referral code generation
SELECT 'Testing referral code generation:' as test;
SELECT public.generate_referral_code('88ff0bde-fa90-4aa7-991e-654eec08951c'::UUID) as test_referral_code;

-- Test referral stats (should show 0 referrals for current user)
SELECT 'Testing referral stats:' as test;
SELECT * FROM public.get_referral_stats('88ff0bde-fa90-4aa7-991e-654eec08951c'::UUID);

-- Verify the referral_count column was added
SELECT 'Verifying referral_count column:' as test;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'referral_count';
