-- Check current user profile data in both auth.users and public.profiles tables

-- Check auth.users data (Google OAuth metadata)
SELECT 
    'auth.users' as table_name,
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_user_meta_data->>'picture' as picture,
    raw_user_meta_data->>'name' as name,
    created_at
FROM auth.users 
WHERE email = 'jasonbooncm3699@gmail.com';

-- Check public.profiles data
SELECT 
    'public.profiles' as table_name,
    id,
    display_name,
    avatar_url,
    token_count,
    referral_code,
    created_at,
    updated_at
FROM public.profiles 
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'jasonbooncm3699@gmail.com'
);

-- Check if provisioning function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('handle_new_user_provisioning', 'provision_user_profile_manually');
