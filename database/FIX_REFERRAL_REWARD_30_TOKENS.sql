-- FIX REFERRAL REWARD SYSTEM: Update from 5 tokens to 30 tokens
-- This script updates the existing referral system to award 30 tokens per referral

-- Update the process_referral_reward function to award 30 tokens instead of 5
CREATE OR REPLACE FUNCTION public.process_referral_reward(
    new_user_id UUID,
    referral_code_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    referrer_user_id UUID := NULL;
    referrer_tokens_before INTEGER;
    referrer_tokens_after INTEGER;
    reward_tokens INTEGER := 30; -- FIXED: Give 30 tokens per successful referral
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

-- Update the get_referral_stats function to calculate 30 tokens per referral
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
        (p.referral_count * 30) as total_tokens_earned -- FIXED: 30 tokens per referral
    FROM public.profiles p
    WHERE p.id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update function comments to reflect 30 token rewards
COMMENT ON FUNCTION public.process_referral_reward(UUID, TEXT) IS 'Processes referral rewards when a new user signs up with a referral code. Awards 30 tokens to the referrer.';
COMMENT ON FUNCTION public.get_referral_stats(UUID) IS 'Returns referral statistics for a user including referral count and total tokens earned (30 tokens per referral)';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.process_referral_reward(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats(UUID) TO authenticated;

-- Test the updated function
SELECT 'Testing updated referral reward system:' as test;
SELECT 'Referral reward updated to 30 tokens per successful referral' as status;
