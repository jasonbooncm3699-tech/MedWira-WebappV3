-- VERIFY CHAT HISTORY TABLE STRUCTURE
-- Let's first understand what we're working with before making any changes

-- ============================================
-- STEP 1: Check current table structure
-- ============================================
SELECT 'CURRENT CHAT_HISTORY TABLE STRUCTURE:' as info;
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
-- STEP 2: Check constraints on the table
-- ============================================
SELECT 'TABLE CONSTRAINTS:' as info;
SELECT 
    constraint_name,
    constraint_type,
    column_name,
    is_deferrable,
    initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'chat_history';

-- ============================================
-- STEP 3: Check NOT NULL constraints specifically
-- ============================================
SELECT 'NOT NULL CONSTRAINTS:' as info;
SELECT 
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_history'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- ============================================
-- STEP 4: Check if table has any existing data
-- ============================================
SELECT 'CURRENT DATA COUNT:' as info;
SELECT COUNT(*) as total_records FROM chat_history;

-- ============================================
-- STEP 5: Check RLS policies
-- ============================================
SELECT 'ROW LEVEL SECURITY POLICIES:' as info;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'chat_history' 
  AND schemaname = 'public';

-- ============================================
-- STEP 6: Show sample of existing data (if any)
-- ============================================
SELECT 'SAMPLE DATA (if exists):' as info;
SELECT * FROM chat_history LIMIT 3;
