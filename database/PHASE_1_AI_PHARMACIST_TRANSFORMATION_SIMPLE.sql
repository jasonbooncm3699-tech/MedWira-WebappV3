-- PHASE 1: AI PHARMACIST TRANSFORMATION - SIMPLE STEP-BY-STEP APPROACH
-- This script creates the AI pharmacist database structure step by step

-- ============================================
-- STEP 1: Create basic chat_history table first
-- ============================================
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  medicine_name VARCHAR(255),
  generic_name VARCHAR(255),
  dosage TEXT,
  side_effects TEXT[],
  interactions TEXT[],
  warnings TEXT[],
  storage TEXT,
  category VARCHAR(100),
  confidence DECIMAL(3,2),
  language VARCHAR(10) DEFAULT 'English',
  allergies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: Add conversation tracking columns one by one
-- ============================================
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user';
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS ai_response TEXT;
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS conversation_context TEXT;
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS message_sequence INTEGER DEFAULT 1;
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT uuid_generate_v4();

-- ============================================
-- STEP 3: Create medication stack table
-- ============================================
CREATE TABLE IF NOT EXISTS user_medication_stack (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  generic_name TEXT,
  active_ingredients TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  frequency TEXT,
  dosage TEXT,
  is_active BOOLEAN DEFAULT true,
  chat_history_id UUID REFERENCES chat_history(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 4: Create indexes (only after columns exist)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_medication_stack_user_active ON user_medication_stack(user_id, is_active);

-- ============================================
-- STEP 5: Set up RLS policies
-- ============================================
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

-- ============================================
-- STEP 6: Verification
-- ============================================
SELECT 'CHAT_HISTORY TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_history'
ORDER BY ordinal_position;

SELECT 'MEDICATION_STACK TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_medication_stack'
ORDER BY ordinal_position;

SELECT 'ALL TABLES IN PUBLIC SCHEMA:' as info;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT 'PHASE 1 COMPLETE: AI Pharmacist database transformation successful!' as status;
