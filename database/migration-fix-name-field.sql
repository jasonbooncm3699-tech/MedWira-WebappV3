-- Migration to fix name field in existing users table
-- Run this in your Supabase SQL editor if you get "name field NOT NULL" errors

-- First, update existing users with empty names to have a default value
UPDATE users SET name = COALESCE(name, '') WHERE name IS NULL;

-- Then alter the column to allow NULL values
ALTER TABLE users ALTER COLUMN name DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'name';
