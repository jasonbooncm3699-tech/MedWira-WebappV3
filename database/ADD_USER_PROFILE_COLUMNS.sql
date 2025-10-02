-- Add display_name and avatar_url columns to user_profiles table
-- This enables storing user information from Google sign-up

-- Add display_name column to store user's name from Google sign-up
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add avatar_url column to store user's profile picture URL from Google sign-up
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for display_name searches (optional but useful for user lookups)
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON public.user_profiles(display_name);

-- Verify the columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
    AND column_name IN ('display_name', 'avatar_url')
ORDER BY ordinal_position;

-- Show updated table structure
\d public.user_profiles;
