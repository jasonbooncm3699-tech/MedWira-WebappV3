-- Function to get complete user profile with Google data from auth.users
-- This function combines Google OAuth metadata with token/referral data

CREATE OR REPLACE FUNCTION public.get_user_complete_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    profile_picture_url TEXT,
    user_name TEXT,
    token_count INTEGER,
    referral_code TEXT,
    referral_count INTEGER,
    referred_by TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        au.raw_user_meta_data->>'full_name' as display_name,
        au.raw_user_meta_data->>'avatar_url' as avatar_url,
        COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture') as profile_picture_url,
        COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email) as user_name,
        COALESCE(p.token_count, 30) as token_count,
        p.referral_code,
        COALESCE(p.referral_count, 0) as referral_count,
        p.referred_by,
        au.created_at,
        au.updated_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE au.id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_complete_profile(UUID) TO authenticated;

-- Test the function
SELECT * FROM public.get_user_complete_profile('88ff0bde-fa90-4aa7-991e-654eec08951c'::UUID);
