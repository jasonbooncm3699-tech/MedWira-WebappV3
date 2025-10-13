-- CHECK EXISTING COLUMNS IN CHAT_HISTORY TABLE
-- This script will show all current columns to see what's already been added

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_history'
ORDER BY ordinal_position;
