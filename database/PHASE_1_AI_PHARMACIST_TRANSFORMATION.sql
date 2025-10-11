-- PHASE 1: AI PHARMACIST TRANSFORMATION - DATABASE CHANGES
-- This script transforms the database to support AI pharmacist chat functionality
-- 
-- Changes:
-- 1. Rename scan_history to chat_history
-- 2. Add conversation tracking columns
-- 3. Create medication stack table for interaction checking

-- ============================================
-- STEP 1: Rename scan_history to chat_history
-- ============================================
ALTER TABLE scan_history RENAME TO chat_history;

-- ============================================
-- STEP 2: Add conversation tracking columns
-- ============================================
-- Add message type (user, ai, system)
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user';

-- Add AI response text
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS ai_response TEXT;

-- Add conversation context (for follow-up questions)
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS conversation_context TEXT;

-- Add message sequence number (for conversation flow)
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS message_sequence INTEGER DEFAULT 1;

-- Add conversation session ID (to group related messages)
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT uuid_generate_v4();

-- ============================================
-- STEP 3: Create medication stack table
-- ============================================
-- This table tracks what medicines users are currently taking
CREATE TABLE IF NOT EXISTS user_medication_stack (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  generic_name TEXT,
  active_ingredients TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  frequency TEXT, -- e.g., "Once daily", "Twice daily", "As needed"
  dosage TEXT, -- e.g., "500mg", "1 tablet"
  is_active BOOLEAN DEFAULT true,
  scan_history_id UUID REFERENCES chat_history(id), -- Link to original scan
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 4: Create indexes for better performance
-- ============================================
-- Index for chat history by user and session
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON chat_history(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_message_sequence ON chat_history(session_id, message_sequence);

-- Index for medication stack
CREATE INDEX IF NOT EXISTS idx_medication_stack_user_active ON user_medication_stack(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medication_stack_medicine ON user_medication_stack(medicine_name);

-- ============================================
-- STEP 5: Update RLS policies for new tables
-- ============================================
-- Enable RLS on new medication stack table
ALTER TABLE user_medication_stack ENABLE ROW LEVEL SECURITY;

-- Users can only see their own medication stack
DROP POLICY IF EXISTS "Users can view own medication stack" ON user_medication_stack;
CREATE POLICY "Users can view own medication stack" ON user_medication_stack
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own medication stack
DROP POLICY IF EXISTS "Users can insert own medication stack" ON user_medication_stack;
CREATE POLICY "Users can insert own medication stack" ON user_medication_stack
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own medication stack
DROP POLICY IF EXISTS "Users can update own medication stack" ON user_medication_stack;
CREATE POLICY "Users can update own medication stack" ON user_medication_stack
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own medication stack
DROP POLICY IF EXISTS "Users can delete own medication stack" ON user_medication_stack;
CREATE POLICY "Users can delete own medication stack" ON user_medication_stack
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STEP 6: Create triggers for updated_at timestamps
-- ============================================
-- Trigger for medication stack updated_at
DROP TRIGGER IF EXISTS update_medication_stack_updated_at ON user_medication_stack;
CREATE TRIGGER update_medication_stack_updated_at 
  BEFORE UPDATE ON user_medication_stack
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: Verification queries
-- ============================================
-- Check chat_history table structure
SELECT 'CHAT_HISTORY TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_history'
ORDER BY ordinal_position;

-- Check medication stack table structure
SELECT 'MEDICATION_STACK TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_medication_stack'
ORDER BY ordinal_position;

-- Check existing chat history data
SELECT 'EXISTING CHAT HISTORY DATA:' as info;
SELECT COUNT(*) as total_records, 
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(DISTINCT session_id) as unique_sessions
FROM chat_history;

-- ============================================
-- STEP 8: Success message
-- ============================================
SELECT 'PHASE 1 COMPLETE: AI Pharmacist database transformation successful!' as status,
       'Chat history table created, medication stack table created, conversation tracking enabled' as details;
