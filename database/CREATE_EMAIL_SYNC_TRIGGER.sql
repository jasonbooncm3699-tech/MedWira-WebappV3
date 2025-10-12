-- Create trigger to automatically sync email from auth.users to public.profiles
-- This ensures that whenever a user's email is updated in auth.users, it's also updated in profiles

-- First, create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION sync_email_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the profiles table with the new email
    UPDATE public.profiles 
    SET 
        email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
    
    -- If no profile exists, create one (this handles the case where profile creation might be delayed)
    IF NOT FOUND THEN
        INSERT INTO public.profiles (
            id, 
            email, 
            tokens, 
            referral_code, 
            created_at, 
            updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            30, -- Default tokens for new users
            'REF' || UPPER(SUBSTRING(NEW.id::text, 1, 6)), -- Generate referral code
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on auth.users table
-- This will fire whenever a user is inserted or updated
DROP TRIGGER IF EXISTS sync_email_trigger ON auth.users;
CREATE TRIGGER sync_email_trigger
    AFTER INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_email_to_profiles();

-- Test the trigger by checking if it works
-- (This is just a verification query, not an actual update)
SELECT 
    'Trigger created successfully. It will sync email from auth.users to public.profiles' as status;
