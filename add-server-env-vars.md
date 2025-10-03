# 🚨 CRITICAL: Add Missing Server-Side Environment Variables

## The Issue
After integrating Gemini 1.5 Pro, we created server-side API routes that require **server-side** environment variables. You currently only have **client-side** variables configured.

## What You Have (Client-Side)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `NEXT_PUBLIC_GEMINI_API_KEY`

## What You're Missing (Server-Side)
- ❌ `SUPABASE_URL`
- ❌ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ `GOOGLE_API_KEY`

## Quick Fix: Add These Server-Side Variables

### For Vercel:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add these **NEW** variables:

```
SUPABASE_URL = https://mpnmdjnpfkyntbihhtxu.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbm1kam5wZmt5bnRiaWhodHh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgwNjM4OCwiZXhwIjoyMDc0MzgyMzg4fQ.bXCSurKqWLE0Jzg8fxhtjnT94b_XWN9cje2LfihoYz4
GOOGLE_API_KEY = [your existing Gemini API key from NEXT_PUBLIC_GEMINI_API_KEY]
```

### For Netlify:
1. Go to your Netlify project dashboard
2. Site settings → Environment variables
3. Add the same variables as above

### For Other Platforms:
Add the same three environment variables to your deployment platform.

## Why This Happened
- **Before Gemini**: Only client-side Supabase calls (used NEXT_PUBLIC_ variables)
- **After Gemini**: Server-side API routes created (need raw environment variables)
- **Server-side routes**: Cannot access NEXT_PUBLIC_ variables, need raw env vars

## After Adding Variables
1. Redeploy your application
2. The "missing Supabase credentials" error will be resolved
3. User profiles will load correctly with tokens and referral codes

## Verification
After deployment, you should see:
- ✅ No more "missing Supabase credentials" errors
- ✅ User shows correct token count (8 tokens)
- ✅ Referral code displays properly (C275226B)
- ✅ All API routes working correctly

The issue is simply that server-side API routes need server-side environment variables! 🎯
