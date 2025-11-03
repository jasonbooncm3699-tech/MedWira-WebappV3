-- Fix sync_email_to_profiles trigger function
-- This removes the invalid reference to profiles.avatar_url in INSERT VALUES clause
-- The error was: "missing FROM-clause entry for table 'profiles'"
-- FIX: Use INSERT ... ON CONFLICT DO UPDATE to handle both new and existing profiles

DROP FUNCTION IF EXISTS public.sync_email_to_profiles() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_email_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update the profiles table
  -- ON CONFLICT handles both new inserts and existing profile updates
  INSERT INTO public.profiles (
    id, 
    email, 
    display_name,
    avatar_url,
    tokens, 
    referral_code,
    created_at,
    updated_at,
    last_login
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      SPLIT_PART(NEW.email, '@', 1),
      'User'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    ),
    COALESCE((SELECT tokens FROM public.profiles WHERE id = NEW.id), 30),
    COALESCE(
      (SELECT referral_code FROM public.profiles WHERE id = NEW.id),
      'REF' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8))
    ),
    COALESCE(
      (SELECT created_at FROM public.profiles WHERE id = NEW.id),
      NOW()
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      profiles.display_name,
      EXCLUDED.display_name
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      profiles.avatar_url,
      EXCLUDED.avatar_url
    ),
    updated_at = NOW(),
    last_login = NOW();
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS sync_email_trigger ON auth.users;
CREATE TRIGGER sync_email_trigger
    AFTER INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_email_to_profiles();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_email_to_profiles() TO authenticated, anon;

-- Verify the function was created
SELECT 
    'Trigger function fixed successfully' as status,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_email_to_profiles'
  AND pronamespace = 'public'::regnamespace;

