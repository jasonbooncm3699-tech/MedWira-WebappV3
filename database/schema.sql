-- MedWira AI Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  tokens INTEGER DEFAULT 10, -- Free tier starts with 10 tokens
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan history table
CREATE TABLE scan_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  medicine_name VARCHAR(255),
  generic_name VARCHAR(255),
  dosage TEXT,
  side_effects TEXT[], -- Array of side effects
  interactions TEXT[], -- Array of drug interactions
  warnings TEXT[], -- Array of warnings
  storage TEXT,
  category VARCHAR(100),
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  language VARCHAR(10) DEFAULT 'English',
  allergies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NPRA medicines database table
CREATE TABLE npra_medicines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  medicine_name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255) NOT NULL,
  dosage_form VARCHAR(100) NOT NULL,
  strength VARCHAR(100) NOT NULL,
  active_ingredients TEXT[] NOT NULL,
  therapeutic_class VARCHAR(255),
  registration_date DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  country VARCHAR(50) DEFAULT 'Malaysia',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX idx_scan_history_created_at ON scan_history(created_at);
CREATE INDEX idx_npra_medicines_name ON npra_medicines(medicine_name);
CREATE INDEX idx_npra_medicines_generic ON npra_medicines(generic_name);
CREATE INDEX idx_npra_medicines_registration ON npra_medicines(registration_number);
CREATE INDEX idx_npra_medicines_status ON npra_medicines(status);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE npra_medicines ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Scan history policies
CREATE POLICY "Users can view own scan history" ON scan_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan history" ON scan_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- NPRA medicines are public read-only
CREATE POLICY "NPRA medicines are publicly readable" ON npra_medicines
  FOR SELECT USING (true);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample NPRA data (optional - you can remove this if you have real data)
INSERT INTO npra_medicines (
  registration_number, medicine_name, generic_name, manufacturer, 
  dosage_form, strength, active_ingredients, therapeutic_class, 
  registration_date, status
) VALUES 
(
  'MAL12345678A', 'Panadol', 'Paracetamol', 'GlaxoSmithKline',
  'Tablet', '500mg', ARRAY['Paracetamol'], 'Analgesic',
  '2020-01-15', 'active'
),
(
  'MAL87654321B', 'Brufen', 'Ibuprofen', 'Abbott',
  'Tablet', '400mg', ARRAY['Ibuprofen'], 'NSAID',
  '2019-06-20', 'active'
),
(
  'MAL11223344C', 'Amoxicillin', 'Amoxicillin', 'Pfizer',
  'Capsule', '250mg', ARRAY['Amoxicillin'], 'Antibiotic',
  '2021-03-10', 'active'
);
