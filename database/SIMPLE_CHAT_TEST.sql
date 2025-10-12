-- SIMPLE CHAT HISTORY TEST
-- This is a simplified test to verify the chat_history table works

-- ============================================
-- STEP 1: Insert a simple user message
-- ============================================
INSERT INTO chat_history (
    user_id,
    image_url,
    language,
    message_type,
    message_text,
    session_id,
    message_sequence,
    conversation_context,
    created_at
) VALUES (
    '88ff0bde-fa90-4aa7-991e-654eec08951c', -- Jason's user ID
    '', -- Empty string for image_url (NOT NULL constraint)
    'English',
    'user',
    'Hello, this is a test message!',
    uuid_generate_v4(),
    1,
    'Simple test conversation',
    NOW()
);

-- ============================================
-- STEP 2: Check if it worked
-- ============================================
SELECT 'SUCCESS: User message inserted!' as status;
SELECT 
    id,
    user_id,
    message_type,
    message_text,
    session_id,
    created_at
FROM chat_history 
WHERE user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- STEP 3: Count total records for user
-- ============================================
SELECT 'TOTAL RECORDS:' as info, COUNT(*) as count
FROM chat_history 
WHERE user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c';
