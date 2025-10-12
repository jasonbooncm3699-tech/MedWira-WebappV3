-- FIX CHAT HISTORY RLS POLICY
-- This script fixes the Row-Level Security policy for chat_history table

-- ============================================
-- STEP 1: Check current RLS status
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_history';

-- ============================================
-- STEP 2: Check existing policies
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_history';

-- ============================================
-- STEP 3: Create policy to allow inserts for authenticated users
-- ============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert chat history" ON public.chat_history;

-- Create new policy that allows authenticated users to insert their own chat history
CREATE POLICY "Allow authenticated users to insert chat history" ON public.chat_history
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 4: Create policy to allow users to read their own chat history
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated users to read their own chat history" ON public.chat_history;

CREATE POLICY "Allow authenticated users to read their own chat history" ON public.chat_history
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 5: Create policy to allow users to update their own chat history
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated users to update their own chat history" ON public.chat_history;

CREATE POLICY "Allow authenticated users to update their own chat history" ON public.chat_history
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 6: Verify the policies were created
-- ============================================
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_history'
ORDER BY policyname;

-- ============================================
-- STEP 7: Alternative - If policies don't work, disable RLS temporarily
-- ============================================
-- Uncomment the line below if policies still don't work:
-- ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;

SELECT 'Chat history RLS policies created successfully!' as status;
