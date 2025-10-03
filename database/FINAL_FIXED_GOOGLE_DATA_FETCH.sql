-- FINAL FIX: Create function to get user data with Google OAuth metadata
-- This fixes the data type mismatch error (varchar vs text)

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
        au.email::TEXT, -- Cast varchar to TEXT to fix type mismatch
        au.raw_user_meta_data->>'full_name' as display_name,
        au.raw_user_meta_data->>'avatar_url' as avatar_url,
        COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture') as profile_picture_url,
        COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email::TEXT) as user_name,
        COALESCE(p.token_count, 30) as token_count,
        p.referral_code,
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

-- Test the function with your user ID
SELECT * FROM public.get_user_complete_profile('88ff0bde-fa90-4aa7-991e-654eec08951c'::UUID);
