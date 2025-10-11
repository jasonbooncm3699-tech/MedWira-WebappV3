-- PHASE 1: AI PHARMACIST TRANSFORMATION - DATABASE CHANGES (FIXED)
-- This script transforms the database to support AI pharmacist chat functionality
-- 
-- Note: scan_history table was already dropped, so we'll create chat_history from scratch

-- ============================================
-- STEP 1: Create chat_history table (since scan_history was dropped)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT, -- For when users upload photos
  medicine_name VARCHAR(255), -- Identified medicine name
  generic_name VARCHAR(255), -- Generic medicine name
  dosage TEXT, -- Dosage information
  side_effects TEXT[], -- Array of side effects
  interactions TEXT[], -- Array of drug interactions
  warnings TEXT[], -- Array of warnings
  storage TEXT, -- Storage instructions
  category VARCHAR(100), -- Medicine category
  confidence DECIMAL(3,2), -- AI confidence score
  language VARCHAR(10) DEFAULT 'English', -- Response language
  allergies TEXT, -- User allergies at time of chat
  
  -- NEW CONVERSATION TRACKING COLUMNS
  message_type TEXT DEFAULT 'user', -- user, ai, system
  ai_response TEXT, -- AI pharmacist response
  conversation_context TEXT, -- Context for follow-up questions
  message_sequence INTEGER DEFAULT 1, -- Sequence in conversation
  session_id UUID DEFAULT uuid_generate_v4(), -- Group related messages
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: Create medication stack table
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
  chat_history_id UUID REFERENCES chat_history(id), -- Link to original chat
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes for better performance
-- ============================================
-- Index for chat history by user and session
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON chat_history(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_message_sequence ON chat_history(session_id, message_sequence);

-- Index for medication stack
CREATE INDEX IF NOT EXISTS idx_medication_stack_user_active ON user_medication_stack(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medication_stack_medicine ON user_medication_stack(medicine_name);

-- ============================================
-- STEP 4: Set up RLS policies
-- ============================================
-- Enable RLS on tables
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medication_stack ENABLE ROW LEVEL SECURITY;

-- Chat history policies
DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
CREATE POLICY "Users can view own chat history" ON chat_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat history" ON chat_history;
CREATE POLICY "Users can insert own chat history" ON chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Medication stack policies
DROP POLICY IF EXISTS "Users can view own medication stack" ON user_medication_stack;
CREATE POLICY "Users can view own medication stack" ON user_medication_stack
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own medication stack" ON user_medication_stack;
CREATE POLICY "Users can insert own medication stack" ON user_medication_stack
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own medication stack" ON user_medication_stack;
CREATE POLICY "Users can update own medication stack" ON user_medication_stack
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own medication stack" ON user_medication_stack;
CREATE POLICY "Users can delete own medication stack" ON user_medication_stack
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STEP 5: Create triggers for updated_at timestamps
-- ============================================
-- Trigger for medication stack updated_at
DROP TRIGGER IF EXISTS update_medication_stack_updated_at ON user_medication_stack;
CREATE TRIGGER update_medication_stack_updated_at 
  BEFORE UPDATE ON user_medication_stack
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Verification queries
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

-- Check what tables we have
SELECT 'ALL TABLES IN PUBLIC SCHEMA:' as info;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- STEP 7: Success message
-- ============================================
SELECT 'PHASE 1 COMPLETE: AI Pharmacist database transformation successful!' as status,
       'Chat history table created, medication stack table created, conversation tracking enabled' as details;
