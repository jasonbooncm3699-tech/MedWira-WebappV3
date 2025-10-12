-- TEST CHAT HISTORY INSERT
-- This script tests if we can insert records into the chat_history table

-- ============================================
-- STEP 1: Test basic insert (with image_url as empty string to satisfy NOT NULL constraint)
-- ============================================
INSERT INTO chat_history (
    user_id,
    image_url,
    medicine_name,
    generic_name,
    dosage,
    side_effects,
    interactions,
    warnings,
    storage,
    category,
    confidence,
    language,
    allergies,
    message_type,
    ai_response,
    conversation_context,
    message_sequence,
    session_id,
    message_text,
    created_at
) VALUES (
    '88ff0bde-fa90-4aa7-991e-654eec08951c', -- Jason's actual user ID
    '', -- Empty string for image_url (NOT NULL constraint)
    NULL, -- medicine_name
    NULL, -- generic_name
    NULL, -- dosage
    NULL, -- side_effects
    NULL, -- interactions
    NULL, -- warnings
    NULL, -- storage
    NULL, -- category
    NULL, -- confidence
    'English', -- language
    NULL, -- allergies
    'user', -- message_type
    NULL, -- ai_response
    'Database insert test', -- conversation_context
    1, -- message_sequence
    uuid_generate_v4(), -- session_id
    'Test message from database script', -- message_text
    NOW() -- created_at
);

-- ============================================
-- STEP 2: Test AI message insert
-- ============================================
INSERT INTO chat_history (
    user_id,
    image_url,
    medicine_name,
    generic_name,
    dosage,
    side_effects,
    interactions,
    warnings,
    storage,
    category,
    confidence,
    language,
    allergies,
    message_type,
    ai_response,
    conversation_context,
    message_sequence,
    session_id,
    message_text,
    created_at
) VALUES (
    '88ff0bde-fa90-4aa7-991e-654eec08951c', -- Jason's actual user ID
    '', -- Empty string for image_url (NOT NULL constraint)
    'Test Medicine', -- medicine_name
    'Test Generic', -- generic_name
    '500mg daily', -- dosage
    ARRAY['Nausea', 'Headache'], -- side_effects
    ARRAY['Coffee', 'Alcohol'], -- interactions
    ARRAY['Take with food'], -- warnings
    'Store in cool place', -- storage
    'Pain Relief', -- category
    0.95, -- confidence
    'English', -- language
    NULL, -- allergies
    'ai', -- message_type
    'This is a test AI response from the database script.', -- ai_response
    'Database insert test', -- conversation_context
    2, -- message_sequence
    (SELECT session_id FROM chat_history WHERE message_text = 'Test message from database script' LIMIT 1), -- session_id
    NULL, -- message_text
    NOW() -- created_at
);

-- ============================================
-- STEP 3: Verify the inserts worked
-- ============================================
SELECT 'TEST INSERT RESULTS:' as info;
SELECT 
    id,
    user_id,
    message_type,
    message_text,
    ai_response,
    session_id,
    message_sequence,
    medicine_name,
    created_at
FROM chat_history 
WHERE user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c'
ORDER BY created_at DESC
LIMIT 5;

SELECT 'TOTAL RECORDS FOR USER:' as info;
SELECT COUNT(*) as total_records 
FROM chat_history 
WHERE user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c';

-- ============================================
-- STEP 4: Check RLS policies
-- ============================================
SELECT 'RLS POLICIES ON CHAT_HISTORY:' as info;
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

SELECT 'TEST COMPLETE: Check if records were inserted successfully!' as status;
