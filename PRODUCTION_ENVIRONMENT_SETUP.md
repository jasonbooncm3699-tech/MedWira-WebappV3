# Production Environment Setup Guide

## 🚨 CRITICAL: Fix "Missing Supabase Credentials" Error

Your production environment is missing the required Supabase environment variables, causing the `500 Internal Server Error` with "missing Supabase credentials".

## Environment Variables Required

### 1. Create `.env.local` file in your project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://mpnmdjnpfkyntbihhtxu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbm1kam5wZmt5bnRiaWhodHh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgwNjM4OCwiZXhwIjoyMDc0MzgyMzg4fQ.bXCSurKqWLE0Jzg8fxhtjnT94b_XWN9cje2LfihoYz4

# Supabase Anon Key (for client-side operations)
SUPABASE_ANON_KEY=your_anon_key_here

# Google Gemini API Key
GOOGLE_API_KEY=your_gemini_api_key_here

# Next.js Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mpnmdjnpfkyntbihhtxu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. For Production Deployment (Vercel):

#### Option A: Vercel Dashboard
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables:
   - `SUPABASE_URL` = `https://mpnmdjnpfkyntbihhtxu.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbm1kam5wZmt5bnRiaWhodHh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgwNjM4OCwiZXhwIjoyMDc0MzgyMzg4fQ.bXCSurKqWLE0Jzg8fxhtjnT94b_XWN9cje2LfihoYz4`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://mpnmdjnpfkyntbihhtxu.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_anon_key_here`

#### Option B: Vercel CLI
```bash
vercel env add SUPABASE_URL
# Enter: https://mpnmdjnpfkyntbihhtxu.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbm1kam5wZmt5bnRiaWhodHh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgwNjM4OCwiZXhwIjoyMDc0MzgyMzg4fQ.bXCSurKqWLE0Jzg8fxhtjnT94b_XWN9cje2LfihoYz4

vercel env add NEXT_PUBLIC_SUPABASE_URL
# Enter: https://mpnmdjnpfkyntbihhtxu.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Enter: your_anon_key_here
```

## Missing Anon Key

You'll need to get your Supabase Anon Key from your Supabase dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project: `mpnmdjnpfkyntbihhtxu`
3. Go to Settings → API
4. Copy the "anon public" key
5. Replace `your_anon_key_here` in the environment variables

## After Setting Environment Variables

1. **Redeploy your application** (if using Vercel, push to git or trigger a redeploy)
2. **Test the API endpoint**: `https://your-domain.com/api/user-profile?user_id=88ff0bde-fa90-4aa7-991e-654eec08951c`
3. **Expected result**: Should return `200 OK` with user data instead of `500 Internal Server Error`

## Current Status

✅ **Backend Fixes**: All null pointer crash fixes are implemented and working
✅ **Frontend Fixes**: All guard clauses and error handling are implemented
⚠️ **Production Environment**: Missing Supabase credentials (this guide fixes this)

## Expected Behavior After Fix

- ✅ Valid user: Returns correct data (8 tokens, C275226B referral code)
- ✅ Non-existent user: Returns 404 with "Profile not found"
- ✅ Invalid UUID: Returns 400 with "Invalid user ID format"
- ✅ No more "missing Supabase credentials" errors
- ✅ No more null pointer crashes

## Verification

After setting up the environment variables, you should see in the console:
- `✅ User profile data retrieved successfully: { tokens: 8, referral_code: 'C275226B' }`
- No more `500 Internal Server Error` messages
- No more "missing Supabase credentials" errors

The application will be completely functional with proper token counts and referral codes! 🎉
