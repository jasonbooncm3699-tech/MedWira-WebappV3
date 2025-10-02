-- CRITICAL FIX: Create user_profiles table (it doesn't exist!)
-- This script creates the missing user_profiles table with all required columns
-- Run this FIRST before any other user_profiles operations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the user_profiles table with all required columns
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    token_count INTEGER NOT NULL DEFAULT 30,
    referral_code VARCHAR(8) UNIQUE,
    referral_count INTEGER DEFAULT 0,
    referred_by VARCHAR(8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_token_count ON public.user_profiles(token_count);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view referral codes" ON public.user_profiles;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to read referral codes (for referral system)
CREATE POLICY "Users can view referral codes" ON public.user_profiles
    FOR SELECT USING (true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Verify the table was created successfully
SELECT 
    table_name, 
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'user_profiles';

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Test the table by showing its structure
\d public.user_profiles;
