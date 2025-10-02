-- Ensure display_name and avatar_url columns exist in public.profiles table
-- These columns should already exist based on the table structure shown in Supabase

-- Add display_name column if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add avatar_url column if it doesn't exist  
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for display_name searches (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('display_name', 'avatar_url')
ORDER BY ordinal_position;

-- Show updated table structure
\d public.profiles;
