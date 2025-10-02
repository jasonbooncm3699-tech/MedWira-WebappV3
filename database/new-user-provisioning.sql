-- MedWira AI - New User Provisioning System
-- This script creates triggers and functions to automatically provision new users
-- with 30 welcome tokens and unique referral codes upon successful registration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add referral_code column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(20);

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate a 8-character alphanumeric code
        code := UPPER(
            SUBSTRING(
                MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 
                1, 8
            )
        );
        
        -- Check if this code already exists
        SELECT COUNT(*) INTO exists_count 
        FROM users 
        WHERE referral_code = code;
        
        -- If code doesn't exist, we can use it
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user provisioning
CREATE OR REPLACE FUNCTION handle_new_user_provisioning()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    referral_code VARCHAR(20);
    referred_by_code VARCHAR(20) := NULL;
    referring_user_id UUID := NULL;
BEGIN
    -- Get the new user's ID
    new_user_id := NEW.id;
    
    -- Generate unique referral code
    referral_code := generate_referral_code();
    
    -- Check if there's a referral parameter in the signup
    -- This would be handled by the application when creating the user record
    
    -- Insert user record with welcome tokens and referral code
    INSERT INTO users (
        id,
        email,
        name,
        tokens,
        subscription_tier,
        referral_code,
        referral_count,
        referred_by,
        created_at,
        updated_at,
        last_login
    ) VALUES (
        new_user_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 
                 NEW.raw_user_meta_data->>'name',
                 NEW.raw_user_meta_data->>'user_name',
                 SPLIT_PART(NEW.email, '@', 1),
                 'User'),
        30, -- Welcome tokens
        'free',
        referral_code,
        0, -- Initial referral count
        referred_by_code,
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW();
    
    -- If user was referred, update the referring user's referral count
    IF referred_by_code IS NOT NULL THEN
        UPDATE users 
        SET referral_count = referral_count + 1,
            updated_at = NOW()
        WHERE referral_code = referred_by_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table for new user provisioning
DROP TRIGGER IF EXISTS trigger_new_user_provisioning ON auth.users;
CREATE TRIGGER trigger_new_user_provisioning
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_provisioning();

-- Alternative function for manual user provisioning (used by auth callback)
CREATE OR REPLACE FUNCTION provision_user_manually(
    user_id UUID,
    user_email TEXT,
    user_name TEXT DEFAULT NULL,
    referral_code_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_referral_code VARCHAR(20);
    referred_by_user_id UUID := NULL;
    result JSON;
BEGIN
    -- Generate unique referral code for new user
    new_referral_code := generate_referral_code();
    
    -- If referral code provided, find the referring user
    IF referral_code_param IS NOT NULL AND referral_code_param != '' THEN
        SELECT id INTO referred_by_user_id 
        FROM users 
        WHERE referral_code = referral_code_param;
        
        -- If referring user found, update their referral count
        IF referred_by_user_id IS NOT NULL THEN
            UPDATE users 
            SET referral_count = referral_count + 1,
                updated_at = NOW()
            WHERE id = referred_by_user_id;
        END IF;
    END IF;
    
    -- Insert or update user record
    INSERT INTO users (
        id,
        email,
        name,
        tokens,
        subscription_tier,
        referral_code,
        referral_count,
        referred_by,
        created_at,
        updated_at,
        last_login
    ) VALUES (
        user_id,
        user_email,
        COALESCE(user_name, SPLIT_PART(user_email, '@', 1), 'User'),
        30, -- Welcome tokens
        'free',
        new_referral_code,
        0, -- Initial referral count
        referral_code_param,
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW(),
        -- Only update tokens if user has 0 tokens (new user)
        tokens = CASE 
            WHEN users.tokens = 0 THEN 30 
            ELSE users.tokens 
        END;
    
    -- Return success result
    SELECT json_build_object(
        'success', true,
        'user_id', user_id,
        'referral_code', new_referral_code,
        'tokens', 30,
        'referred_by', referral_code_param
    ) INTO result;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    SELECT json_build_object(
        'success', false,
        'error', SQLERRM
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user by referral code
CREATE OR REPLACE FUNCTION get_user_by_referral_code(referral_code_param TEXT)
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    referral_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.name, u.referral_count
    FROM users u
    WHERE u.referral_code = referral_code_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update user tokens (for API usage)
CREATE OR REPLACE FUNCTION update_user_tokens(
    user_id UUID,
    token_change INTEGER
)
RETURNS JSON AS $$
DECLARE
    current_tokens INTEGER;
    new_tokens INTEGER;
    result JSON;
BEGIN
    -- Get current token count
    SELECT tokens INTO current_tokens 
    FROM users 
    WHERE id = user_id;
    
    -- Calculate new token count
    new_tokens := GREATEST(0, current_tokens + token_change);
    
    -- Update tokens
    UPDATE users 
    SET tokens = new_tokens,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Return result
    SELECT json_build_object(
        'success', true,
        'user_id', user_id,
        'previous_tokens', current_tokens,
        'new_tokens', new_tokens,
        'token_change', token_change
    ) INTO result;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    SELECT json_build_object(
        'success', false,
        'error', SQLERRM
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_provisioning() TO authenticated;
GRANT EXECUTE ON FUNCTION provision_user_manually(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_tokens(UUID, INTEGER) TO authenticated;

-- Update RLS policies for new columns
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to read referral codes (for referral system)
CREATE POLICY "Users can view referral codes" ON users
    FOR SELECT USING (true);

-- Test the system
-- SELECT provision_user_manually(
--     uuid_generate_v4(),
--     'test@example.com',
--     'Test User',
--     NULL
-- );

-- Verify the trigger works
-- INSERT INTO auth.users (id, email, raw_user_meta_data) 
-- VALUES (uuid_generate_v4(), 'test2@example.com', '{"name": "Test User 2"}');

COMMENT ON FUNCTION generate_referral_code() IS 'Generates a unique 8-character alphanumeric referral code';
COMMENT ON FUNCTION handle_new_user_provisioning() IS 'Trigger function that automatically provisions new users with 30 tokens and referral code';
COMMENT ON FUNCTION provision_user_manually(UUID, TEXT, TEXT, TEXT) IS 'Manually provisions a user with welcome tokens and referral code';
COMMENT ON FUNCTION get_user_by_referral_code(TEXT) IS 'Retrieves user information by referral code';
COMMENT ON FUNCTION update_user_tokens(UUID, INTEGER) IS 'Updates user token count with change amount';
