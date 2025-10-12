-- VERIFY CHAT HISTORY SCHEMA - Final Check
-- This script verifies the exact schema of the chat_history table

-- ============================================
-- STEP 1: Check table structure
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_history'
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: Check constraints
-- ============================================
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'chat_history'
  AND tc.table_schema = 'public';

-- ============================================
-- STEP 3: Test insert with minimal data
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
    'Test message to verify schema',
    gen_random_uuid(),
    1,
    '',
    'English'
) RETURNING id, user_id, message_type, created_at;

-- ============================================
-- STEP 4: Clean up test data
-- ============================================
DELETE FROM public.chat_history 
WHERE message_text = 'Test message to verify schema'
  AND user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c';

SELECT 'Schema verification completed successfully!' as status;
