-- Verify the current structure of the public.profiles table
-- Check what columns already exist

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Show complete table structure
\d public.profiles;
