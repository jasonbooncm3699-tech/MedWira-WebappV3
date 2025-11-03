# OAuth Sign Up Issue - Diagnosis

## Problem
User completes Google OAuth signup, returns to homepage **without being signed in**.

## Potential Causes

### 1. Session Cookie Not Being Set ✅ MOST LIKELY
**Issue:** The session cookie isn't being set during OAuth callback
**Location:** `app/auth/callback/route.ts` line 38

**Check:**
- Server logs should show "✅ Session created successfully"
- But cookie might not be persisting

**Why it might happen:**
- Cookie domain mismatch
- Cookie SameSite attribute issue
- HTTP vs HTTPS cookie issue

### 2. Database Profile Creation Failing
**Issue:** The profiles table insert fails silently
**Location:** `app/auth/callback/route.ts` lines 87-113

**Why it might fail:**
- Missing column in profiles table
- NOT NULL constraint on a column receiving NULL
- Foreign key constraint issue
- RLS policy blocking the insert

**Current code:**
```typescript
.upsert({
  id: user.id,
  tokens: 30,
  referral_code: simpleReferralCode,
  referred_by: referralCode || null,  // ← Could be NULL
  email: user.email,
  display_name: userName,
  subscription_tier: 'free',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

### 3. Silent Error Handling
**Issue:** Database error is caught but not surfaced
**Location:** `app/auth/callback/route.ts` lines 105-113

```typescript
if (provisionError) {
  console.error('❌ User provisioning failed:', provisionError);
  // ← STILL CONTINUES! Even if provisioning failed!
} else {
  console.log('✅ User provisioned successfully:', provisionResult);
}
```

**Problem:** If provisioning fails, the code continues and redirects. User ends up with no profile record.

## Recommended Solutions

### Solution 1: Make Database Error Blocking
Don't redirect if profile creation fails.

```typescript
if (provisionError) {
  console.error('❌ User provisioning failed:', provisionError);
  return NextResponse.redirect(new URL('/?error=provision_failed', request.url));
}
```

### Solution 2: Check profiles table schema
Run this in Supabase SQL editor:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

Expected columns:
- `id` UUID (PRIMARY KEY)
- `tokens` INTEGER
- `referral_code` VARCHAR
- `referred_by` VARCHAR or UUID (NULLABLE!)
- `email` VARCHAR
- `display_name` TEXT
- `subscription_tier` VARCHAR
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### Solution 3: Verify Session Cookie
Add this to check if cookie is being set:

```typescript
console.log('🔐 Cookie details after exchange:', {
  sessionId: data.session.id,
  userId: data.session.user.id,
  hasCookie: !!cookies
});
```

## How to Debug

### Step 1: Check server logs
When user signs up, check for:
- ✅ "✅ Session created successfully"
- ✅ "✅ User provisioned successfully"
- ❌ Any error messages

### Step 2: Check database
Run in Supabase SQL:

```sql
SELECT * FROM profiles 
WHERE email = 'user@example.com'  -- Replace with test email
ORDER BY created_at DESC 
LIMIT 1;
```

If no record found = Profile creation failing

### Step 3: Check auth session
Run in Supabase SQL:

```sql
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

If no record found = OAuth exchange failing

## Quick Fix

**Add better error handling:**

```typescript
if (provisionError) {
  console.error('❌ User provisioning failed:', provisionError);
  // Don't silently continue - return error to user
  return NextResponse.redirect(new URL('/?error=profile_creation_failed', request.url));
}
```

This way, if profile creation fails, user gets an error message instead of silently failing.

## Next Steps

1. Check server logs for actual error messages
2. Verify profiles table has correct schema
3. Add blocking error handling
4. Test OAuth flow again

