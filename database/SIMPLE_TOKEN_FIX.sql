-- SIMPLE FIX: Token Assignment in User Provisioning Function
-- Run this single function to fix the token_count issue

CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    new_referral_code VARCHAR(8);
BEGIN
    -- Generate the unique referral code by calling the function
    new_referral_code := public.generate_referral_code(NEW.id);

    -- Insert the new user's profile with initial tokens and the generated code
    INSERT INTO public.user_profiles (
        id, 
        token_count, 
        referral_code,
        referral_count,
        referred_by,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id, 
        30, -- CRITICAL FIX: Explicitly set the token count to 30
        new_referral_code, 
        0,  -- Initial referral count
        NULL, -- No referring user initially
        NOW(),
        NOW()
    );
    
    -- The function must return NEW for the trigger to complete successfully.
    RETURN NEW;
END;
$$;
