-- Fix Jason's Profile - Create missing profile record
-- This will create the profile record for Jason so he can use the AI agent

-- Insert Jason's profile with 30 tokens as shown in frontend
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
    '88ff0bde-fa90-4aa7-991e-654eec08951c',  -- Jason's user ID
    30,                                        -- 30 tokens as shown in frontend
    'C275226B',                               -- Referral code as shown in frontend
    0,                                        -- Default referral count
    NULL,                                     -- Not referred by anyone
    'Jason',                                  -- Display name
    NULL,                                     -- No avatar URL
    NOW(),                                    -- Created timestamp
    NOW()                                     -- Updated timestamp
) ON CONFLICT (id) DO UPDATE SET
    token_count = EXCLUDED.token_count,
    referral_code = EXCLUDED.referral_code,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- Verify the profile was created
SELECT 
    id,
    token_count,
    referral_code,
    display_name,
    created_at
FROM public.profiles 
WHERE id = '88ff0bde-fa90-4aa7-991e-654eec08951c';
