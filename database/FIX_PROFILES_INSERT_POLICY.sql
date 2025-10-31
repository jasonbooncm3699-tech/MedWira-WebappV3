-- Fix profiles table RLS: Add missing INSERT policy
-- This allows authenticated users to create their own profile during OAuth signup

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create INSERT policy for authenticated users
-- Users can only insert their own profile (where auth.uid() = id)
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Grant INSERT permission to authenticated role
GRANT INSERT ON public.profiles TO authenticated;

-- Verify the policy was created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    CASE 
        WHEN cmd = 'INSERT' THEN '✅ INSERT policy exists'
        ELSE '❌ Other policy'
    END as policy_status
FROM pg_policies 
WHERE tablename = 'profiles'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Show all policies on profiles table
SELECT 
    'All RLS policies on profiles table:' as info,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ View own profile'
        WHEN cmd = 'INSERT' THEN '✅ Insert own profile'
        WHEN cmd = 'UPDATE' THEN '✅ Update own profile'
        ELSE 'Other: ' || cmd
    END as policy_description
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

SELECT '✅ INSERT policy added to profiles table successfully!' as status;

