-- CRITICAL FIX: user_profiles Table Structure
-- This script adds all necessary columns to the user_profiles table
-- Run this BEFORE attempting any new user signups

-- Add token_count column with default value of 30
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS token_count INTEGER NOT NULL DEFAULT 30;

-- Add referral_code column with unique constraint
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE;

-- Add referral_count column with default value of 0
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Add referred_by column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS referred_by VARCHAR(8);

-- Add timestamps if they don't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_token_count ON public.user_profiles(token_count);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles(referred_by);

-- Verify the table structure
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

-- Show current table structure
\d public.user_profiles;
