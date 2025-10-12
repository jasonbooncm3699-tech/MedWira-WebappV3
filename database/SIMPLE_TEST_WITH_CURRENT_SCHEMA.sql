-- SIMPLE TEST WITH CURRENT SCHEMA
-- This test matches the actual table structure we verified

INSERT INTO chat_history (
    user_id,
    image_url,
    message_type,
    message_text,
    session_id,
    message_sequence,
    conversation_context,
    language
) VALUES (
    '88ff0bde-fa90-4aa7-991e-654eec08951c',
    '', -- Empty string for image_url (NOT NULL constraint)
    'user',
    'Hello, this is a test message!',
    uuid_generate_v4(),
    1,
    'Simple test conversation',
    'English'
);

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
