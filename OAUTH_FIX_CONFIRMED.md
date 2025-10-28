# OAuth Sign Up Fix - Confirmed Database Schema

## Database Schema Confirmed

Based on the Supabase dashboard screenshot, the `profiles` table has these columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (references auth.users) |
| `tokens` | integer | User's token balance |
| `display_name` | text | User's display name |
| `avatar_url` | text | User's profile picture URL |
| `referral_code` | text | User's unique referral code |
| `referred_by` | uuid | Who referred this user |
| `email` | character varying | User's email address |
| `subscription_tier` | character varying | User's subscription level |
| `created_at` | timestamp with time zone | Account creation time |
| `updated_at` | timestamp with time zone | Last update time |
| `last_login` | timestamp with time zone | Last login time |

## Fixes Applied

### 1. OAuth Callback (`app/auth/callback/route.ts`)
✅ Fixed to use correct table: `profiles`
✅ Fixed to use correct columns:
- `tokens: 30` (not `token_count: 30`)
- `email: user.email`
- `subscription_tier: 'free'`
- `avatar_url: avatarUrl` (extracted from Google OAuth metadata)
- `referred_by: referralCode || null`

✅ Added better error handling:
- Now returns error to user if profile creation fails
- Previously would silently continue even on database failure

### 2. User Profile API (`app/api/user-profile/route.ts`)
✅ Fixed to query correct table: `profiles`
✅ Fixed to select correct columns:
- `tokens` (not `token_count`)
- `email`
- `subscription_tier`

## What This Fixes

**Before the fix:**
1. User completes Google OAuth signup
2. Callback tries to insert into wrong table (`user_profiles` doesn't exist)
3. OR inserts succeed but API can't read from `profiles` (wrong column names)
4. User appears not signed in after redirect

**After the fix:**
1. User completes Google OAuth signup
2. Callback inserts into correct table (`profiles`) with correct columns
3. Profile is created successfully
4. User is redirected to homepage
5. Frontend fetches profile via `/api/user-profile`
6. Profile is found and user is signed in ✅

## Testing Checklist

- [ ] Sign up with Google OAuth
- [ ] Check if user is signed in after redirect
- [ ] Verify user profile exists in Supabase
- [ ] Check if avatar_url is populated
- [ ] Check if tokens = 30
- [ ] Check if referral_code is generated
- [ ] Test signup without referral code
- [ ] Test signup with referral code

## Next Steps

After deploying this fix:
1. Test the OAuth signup flow
2. Check Vercel logs for any errors
3. Verify users are being created in `profiles` table
4. Confirm users stay signed in after redirect

