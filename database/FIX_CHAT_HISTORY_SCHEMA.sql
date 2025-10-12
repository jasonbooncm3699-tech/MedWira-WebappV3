-- FIX CHAT HISTORY SCHEMA - Add missing columns for unified chat storage
-- This script adds the missing columns that are needed for the unified chat system

-- ============================================
-- STEP 1: Add missing columns to chat_history table
-- ============================================

-- Add message_text column (for user messages)
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS message_text TEXT;

-- Update the existing columns to match the expected schema
-- (Some columns might already exist, but we ensure they have the right structure)

-- Ensure message_type has proper default and constraints
ALTER TABLE chat_history ALTER COLUMN message_type SET DEFAULT 'user';
ALTER TABLE chat_history ALTER COLUMN message_type SET NOT NULL;

-- Ensure ai_response column exists (for AI messages)
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS ai_response TEXT;

-- Ensure session_id has proper default
ALTER TABLE chat_history ALTER COLUMN session_id SET DEFAULT uuid_generate_v4();

-- Ensure message_sequence has proper default
ALTER TABLE chat_history ALTER COLUMN message_sequence SET DEFAULT 1;

-- Add updated_at column for tracking modifications
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- STEP 2: Create trigger to update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_chat_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_chat_history_updated_at_trigger ON chat_history;

-- Create the trigger
CREATE TRIGGER update_chat_history_updated_at_trigger
    BEFORE UPDATE ON chat_history
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_history_updated_at();

-- ============================================
-- STEP 3: Verify the schema
-- ============================================
SELECT 'CHAT_HISTORY TABLE STRUCTURE AFTER FIX:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_history'
ORDER BY ordinal_position;

-- ============================================
-- STEP 4: Test insert to verify the schema works
-- ============================================
-- Insert a test record to verify the schema works
INSERT INTO chat_history (
    user_id,
    message_type,
    message_text,
    session_id,
    message_sequence,
    conversation_context
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Test UUID
    'user',
    'Test message to verify schema',
    uuid_generate_v4(),
    1,
    'Schema verification test'
);

-- Check if the insert worked
SELECT 'TEST INSERT RESULT:' as info;
SELECT COUNT(*) as test_records FROM chat_history 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Clean up test record
DELETE FROM chat_history 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

SELECT 'SCHEMA FIX COMPLETE: chat_history table is now ready for unified chat storage!' as status;
