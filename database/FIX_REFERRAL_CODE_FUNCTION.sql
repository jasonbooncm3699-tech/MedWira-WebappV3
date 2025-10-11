-- Fix the generate_referral_code function to generate exactly 8-character codes
-- The current function is generating codes longer than 8 characters

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
        -- Create a more reliable 8-character code generation
        random_code := encode(digest(user_uuid::text || clock_timestamp()::text || random()::text, 'md5'), 'hex');
        -- Take exactly 8 characters from the hex string and convert to uppercase
        referral_code_candidate := UPPER(SUBSTRING(random_code, 1, 8));
        
        -- Check if the generated code already exists in the profiles table
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = referral_code_candidate) THEN
            RETURN referral_code_candidate;
        END IF;
    END LOOP;
END;
$$;

-- Test the function
SELECT 'Testing referral code generation:' as info;
SELECT public.generate_referral_code('e439b5e8-0b86-4c5a-8271-6ca9d9961b66'::UUID) as test_code;

-- Now fix risma.a's referral code
UPDATE public.profiles 
SET referral_code = public.generate_referral_code('e439b5e8-0b86-4c5a-8271-6ca9d9961b66'::UUID)
WHERE id = 'e439b5e8-0b86-4c5a-8271-6ca9d9961b66';

-- Verify the update worked
SELECT 'Updated referral codes:' as info;
SELECT id, display_name, referral_code, LENGTH(referral_code) as code_length
FROM profiles 
ORDER BY created_at;
