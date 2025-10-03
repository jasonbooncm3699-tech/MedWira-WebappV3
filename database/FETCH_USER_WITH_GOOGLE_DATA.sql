-- Create a view that combines auth.users Google data with public.profiles token data
-- This eliminates the need to copy data between tables

CREATE OR REPLACE VIEW public.user_complete_profile AS
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as display_name,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    au.raw_user_meta_data->>'picture' as picture,
    COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture') as profile_picture_url,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email) as user_name,
    COALESCE(p.token_count, 30) as token_count,
    p.referral_code,
    0 as referral_count, -- Default value since column doesn't exist
    p.referred_by,
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;

-- Grant access to authenticated users
GRANT SELECT ON public.user_complete_profile TO authenticated;

-- Test the view
SELECT * FROM public.user_complete_profile WHERE email = 'jasonbooncm3699@gmail.com';
