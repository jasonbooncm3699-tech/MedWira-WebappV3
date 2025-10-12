-- FIX CHAT HISTORY SERVICE ROLE POLICY
-- This script adds a policy to allow service role to insert chat history

-- ============================================
-- STEP 1: Add policy for service role to insert chat history
-- ============================================
DROP POLICY IF EXISTS "Service role can insert chat history" ON public.chat_history;

CREATE POLICY "Service role can insert chat history" ON public.chat_history
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

-- ============================================
-- STEP 2: Add policy for service role to read chat history
-- ============================================
DROP POLICY IF EXISTS "Service role can read chat history" ON public.chat_history;

CREATE POLICY "Service role can read chat history" ON public.chat_history
    FOR SELECT 
    TO service_role
    USING (true);

-- ============================================
-- STEP 3: Add policy for service role to update chat history
-- ============================================
DROP POLICY IF EXISTS "Service role can update chat history" ON public.chat_history;

CREATE POLICY "Service role can update chat history" ON public.chat_history
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- STEP 4: Verify the new policies
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
AND policyname LIKE '%Service role%'
ORDER BY policyname;

-- ============================================
-- STEP 5: Show all policies for chat_history
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

SELECT 'Service role policies created successfully!' as status;
