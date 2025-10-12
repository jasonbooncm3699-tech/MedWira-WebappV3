-- DISABLE CHAT HISTORY RLS TEMPORARILY
-- This script disables RLS for chat_history table to allow inserts

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
-- STEP 2: Disable RLS for chat_history table
-- ============================================
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Verify RLS is disabled
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_history';

-- ============================================
-- STEP 4: Test insert to verify it works
-- ============================================
INSERT INTO public.chat_history (
    user_id,
    message_type,
    message_text,
    session_id,
    message_sequence,
    image_url,
    language
) VALUES (
    '88ff0bde-fa90-4aa7-991e-654eec08951c',
    'user',
    'RLS disabled test message',
    gen_random_uuid(),
    1,
    '',
    'English'
) RETURNING id, user_id, message_type, created_at;

-- ============================================
-- STEP 5: Clean up test data
-- ============================================
DELETE FROM public.chat_history 
WHERE message_text = 'RLS disabled test message'
  AND user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c';

SELECT 'RLS disabled for chat_history table successfully!' as status;
