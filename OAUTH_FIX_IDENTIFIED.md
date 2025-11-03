# OAuth Sign Up Issue - Root Cause Identified

## Problem Summary
User completes Google OAuth, returns to homepage but **NOT signed in**.

## Root Cause: Table/Column Name Mismatch 🔴

### Issue 1: Table Name Mismatch
**Callback is inserting into:** `profiles` (line 88 in callback)
**Database table is named:** `user_profiles` (all SQL files)

### Issue 2: Column Name Mismatch  
**Callback is trying to insert:**
- `tokens` (line 91)
- `email` (line 94)
- `subscription_tier` (line 96)

**Database table actually has:**
- `token_count` (not `tokens`)
- `email` column might not exist in user_profiles
- `subscription_tier` column might not exist

## Evidence

### From callback code (`app/auth/callback/route.ts`):
```typescript
const { data: provisionResult, error: provisionError } = await supabase
  .from('profiles')  // ← WRONG TABLE NAME
  .upsert({
    id: user.id,
    tokens: 30,  // ← WRONG COLUMN NAME
    referral_code: simpleReferralCode,
    referred_by: referralCode || null,
    email: user.email,  // ← COLUMN MIGHT NOT EXIST
    display_name: userName,
    subscription_tier: 'free',  // ← COLUMN MIGHT NOT EXIST
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
    ignoreDuplicates: false
  })
  .select();
```

### From database schema files:
```sql
CREATE TABLE IF NOT EXISTS public.user_profiles (  -- ← DIFFERENT TABLE NAME
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token_count INTEGER NOT NULL DEFAULT 30,  -- ← token_count, not tokens
  referral_code VARCHAR(8) UNIQUE,
  referral_count INTEGER DEFAULT 0,
  referred_by VARCHAR(8),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Missing columns:**
- ❌ `email` column doesn't exist in user_profiles
- ❌ `subscription_tier` column doesn't exist in user_profiles

## Why User Returns Without Sign In

1. **Callback tries to insert into non-existent table `profiles`**
2. **OR table exists but columns don't match** (`tokens` vs `token_count`)
3. **Database insert fails silently** (line 105-109 catches error but continues)
4. **User gets redirected to homepage**
5. **But profile was never created**
6. **Frontend can't find user profile**
7. **User appears not signed in**

## Solution

### Option 1: Fix Callback to Match Database (RECOMMENDED)
Update callback to use correct table and column names:

```typescript
const { data: provisionResult, error: provisionError } = await supabase
  .from('user_profiles')  // ← FIX: Use correct table name
  .upsert({
    id: user.id,
    token_count: 30,  // ← FIX: Use token_count instead of tokens
    referral_code: simpleReferralCode,
    referred_by: referralCode || null,
    // email: user.email,  // ← REMOVE: Column doesn't exist
    display_name: userName,
    // subscription_tier: 'free',  // ← REMOVE: Column doesn't exist
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
    ignoreDuplicates: false
  })
  .select();
```

### Option 2: Add Missing Columns to Database
If you want to keep using `profiles` table with those columns:

```sql
-- Add missing columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';

-- Rename token_count to tokens if you want to match callback
-- OR rename tokens to token_count in callback (Option 1 is better)
```

## Recommended Fix

**Update callback to match existing database schema.**

Change:
1. `profiles` → `user_profiles`
2. `tokens` → `token_count`
3. Remove `email` and `subscription_tier` (or add them to database)

## Testing After Fix

1. Sign up with Google OAuth
2. Check browser console for errors
3. Check Supabase logs for successful insert
4. Verify user can see their profile after redirect
5. Check database: `SELECT * FROM user_profiles WHERE id = '...'`

