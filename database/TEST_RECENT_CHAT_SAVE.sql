-- TEST RECENT CHAT SAVE
-- Check if recent chat messages are being saved

-- 1. Check total count of chat_history records
SELECT 'TOTAL CHAT HISTORY RECORDS:' as info, COUNT(*) as count FROM public.chat_history;

-- 2. Check recent records (last 24 hours)
SELECT 'RECENT RECORDS (last 24h):' as info, COUNT(*) as count 
FROM public.chat_history 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 3. Show all records with basic info
SELECT 
    id,
    user_id,
    message_type,
    message_text,
    session_id,
    created_at,
    conversation_title,
    conversation_preview
FROM public.chat_history 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check if there are any records with the specific user ID from the logs
SELECT 'RECORDS FOR USER 88ff0bde-fa90-4aa7-991e-654eec08951c:' as info, COUNT(*) as count
FROM public.chat_history 
WHERE user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c';

-- 5. Show records for this specific user
SELECT 
    id,
    message_type,
    message_text,
    session_id,
    created_at,
    conversation_title
FROM public.chat_history 
WHERE user_id = '88ff0bde-fa90-4aa7-991e-654eec08951c'
ORDER BY created_at DESC;
