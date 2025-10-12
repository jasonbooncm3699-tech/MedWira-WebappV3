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
    '88ff0bde-fa90-4aa7-991e-654eec08951c',
    '',
    'English',
    'user',
    'Hello, this is a test message!',
    uuid_generate_v4(),
    1,
    'Simple test conversation',
    NOW()
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
