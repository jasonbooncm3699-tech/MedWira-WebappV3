-- SIMPLE CHAT SAVE TEST
-- Test if we can insert a record into chat_history

-- Insert a test record
INSERT INTO public.chat_history (
    user_id,
    message_type,
    message_text,
    session_id,
    message_sequence,
    image_url,
    language,
    conversation_title,
    conversation_preview,
    conversation_tags,
    created_at
) VALUES (
    '88ff0bde-fa90-4aa7-991e-654eec08951c', -- Known user ID from logs
    'user',
    'Test message from database test script',
    uuid_generate_v4(),
    1,
    '', -- Empty string for image_url
    'English',
    'Test Conversation',
    'This is a test conversation preview',
    ARRAY['TEST', 'DEBUG'],
    NOW()
);

-- Check if the insert worked
SELECT 'TEST INSERT RESULT:' as info, COUNT(*) as total_records FROM public.chat_history;
