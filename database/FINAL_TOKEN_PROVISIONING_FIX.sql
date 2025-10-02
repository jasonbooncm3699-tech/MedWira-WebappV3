-- CRITICAL FIX: Token Provisioning Failure
-- This script creates the missing generate_referral_code() function with UUID parameter
-- to fix the ERROR: 42883 function does not exist error

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the missing generate_referral_code function with UUID parameter
-- This function generates a unique 8-character code for user_profiles table
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_uuid uuid)
RETURNS varchar(8)
LANGUAGE plpgsql
AS $$
DECLARE
    random_code text;
    referral_code_candidate varchar(8);
BEGIN
    -- Generate a unique 8-character code using MD5 hash of the UUID and a random number
    LOOP
        random_code := encode(digest(user_uuid::text || clock_timestamp()::text || random()::text, 'md5'), 'base64');
        -- Extract 8 characters, convert to uppercase, and remove non-alphanumeric characters
        referral_code_candidate := UPPER(regexp_replace(SUBSTRING(random_code, 1, 10), '[^A-Z0-9]', '', 'g'));
        
        -- Check if the generated code already exists in the user_profiles table
        IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE referral_code = referral_code_candidate) THEN
            RETURN referral_code_candidate;
        END IF;
    END LOOP;
END;
$$;

-- Also create the parameterless version for backward compatibility
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    code VARCHAR(8);
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
        
        -- Check if this code already exists in user_profiles table
        SELECT COUNT(*) INTO exists_count 
        FROM public.user_profiles 
        WHERE referral_code = code;
        
        -- If code doesn't exist, we can use it
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.generate_referral_code(uuid) IS 'Generates a unique 8-character alphanumeric referral code using UUID for user_profiles table';
COMMENT ON FUNCTION public.generate_referral_code() IS 'Generates a unique 8-character alphanumeric referral code for user_profiles table (backward compatibility)';

-- Test the function to ensure it works
-- SELECT public.generate_referral_code(uuid_generate_v4());
-- SELECT public.generate_referral_code();

-- Verify the function exists and is accessible
SELECT 
    routine_name, 
    routine_type, 
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'generate_referral_code' 
    AND routine_schema = 'public';
