-- Fix the users table ID constraint issue
-- Run this in Supabase SQL Editor

-- Remove the default constraint from the id column
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- This allows us to insert specific UUIDs from Supabase Auth
