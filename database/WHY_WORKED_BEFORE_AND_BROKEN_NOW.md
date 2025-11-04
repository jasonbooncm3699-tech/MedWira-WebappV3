# Why Profile Creation Worked Before and Why It's Broken Now

## The History: What Changed?

### Previously (Working State)

**Scenario 1: RLS was NOT enabled**
- Profile table had **no Row Level Security** enabled
- Any role (`anon`, `authenticated`, etc.) could INSERT directly
- The OAuth callback could insert profiles without RLS blocking it
- **Why it worked**: No security checks were applied

**Scenario 2: RLS was enabled but INSERT policy was permissive**
- RLS was enabled but the INSERT policy was more lenient
- OR there was no INSERT policy, allowing INSERTs to bypass RLS
- OR the policy used `USING` clause instead of `WITH CHECK`, which has different behavior
- **Why it worked**: RLS existed but wasn't strictly enforced on INSERT

**Scenario 3: Automatic trigger handled profile creation**
- Database trigger `sync_email_trigger` or `handle_new_user_provisioning()` created profiles automatically
- Trigger functions often use `SECURITY DEFINER` which bypasses RLS
- The application code never directly inserted into profiles
- **Why it worked**: Database automatically created profiles without RLS checks

**Scenario 4: Service role or SECURITY DEFINER function**
- Profile creation used `service_role` key (bypasses RLS completely)
- OR used a database function with `SECURITY DEFINER` that bypasses RLS
- **Why it worked**: These methods bypass RLS entirely

---

## Now (Broken State)

### What Changed Recently

Based on the diagnostic results, we can see:

1. **RLS is now ENABLED** ✅ (from `FIX_PROFILES_INSERT_POLICY.sql`)
   ```sql
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ```

2. **Strict INSERT policy was added** ✅
   ```sql
   CREATE POLICY "Users can insert own profile" ON public.profiles
   FOR INSERT 
   WITH CHECK (auth.uid() = id);
   ```

3. **Both `anon` and `authenticated` have INSERT permission** ⚠️
   - From diagnostic: INSERT is granted to both `anon` and `authenticated`

### Why It's Failing Now

The problem occurs during OAuth signup flow:

```
Step 1: User clicks "Sign in with Google"
  └─> No session exists yet
  └─> Operation runs as `anon` role

Step 2: OAuth callback receives code
  └─> Still before session is fully established
  └─> Operation might run as `anon` role

Step 3: Callback tries to INSERT into profiles
  └─> If running as `anon` role: auth.uid() = NULL
  └─> RLS policy checks: WITH CHECK (auth.uid() = id)
  └─> NULL != user.id → ❌ POLICY BLOCKS INSERT

Step 4: Only after exchangeCodeForSession() completes
  └─> User is now `authenticated` role
  └─> auth.uid() = user.id
  └─> RLS policy would allow: auth.uid() == id → ✅
```

**The Issue:**
- The `anon` role has INSERT permission
- But `auth.uid()` returns `NULL` for `anon` role
- The RLS policy `WITH CHECK (auth.uid() = id)` fails because `NULL != user.id`
- Even though `anon` has permission, RLS blocks the INSERT

---

## The Root Cause

**Timing Issue + Incorrect Permissions:**

1. **Permission granted to wrong role**: `anon` has INSERT permission but shouldn't
   - `anon` role cannot satisfy the RLS policy requirement (`auth.uid() = id`)
   - Only `authenticated` role can satisfy this

2. **RLS policy timing**: The strict `WITH CHECK` clause enforces the policy **at INSERT time**
   - If the operation runs as `anon`, it will always fail
   - Even if the session will be created later

3. **Application code timing**: The callback might try to INSERT before the session is fully propagated
   - `exchangeCodeForSession()` creates the session
   - But there might be a brief moment where operations still run as `anon`

---

## Why It Worked Before

### Most Likely Scenario: **No RLS or Lenient Policy**

Before `FIX_PROFILES_INSERT_POLICY.sql` was run:
- Either RLS was **NOT enabled**, allowing any role to INSERT
- OR RLS was enabled but **no INSERT policy existed**, which allows INSERTs to bypass RLS
- OR the INSERT policy was less strict (e.g., only `USING` clause, no `WITH CHECK`)

### Alternative: **Database Trigger Handled It**

If the `sync_email_trigger` or `handle_new_user_provisioning()` trigger was active:
- The trigger function likely used `SECURITY DEFINER`
- This bypasses RLS completely
- The application code never directly inserted into profiles
- Database automatically created profiles on `auth.users` INSERT

---

## The Fix

### Solution 1: Revoke INSERT from `anon` (RECOMMENDED)

```sql
REVOKE INSERT ON public.profiles FROM anon;
```

**Why this fixes it:**
- `anon` role can no longer attempt INSERT operations
- Only `authenticated` role can INSERT (which has valid `auth.uid()`)
- Forces operations to wait until session is established

### Solution 2: Ensure session is established before INSERT

Make sure `exchangeCodeForSession()` completes **before** attempting INSERT:
- Already done in callback code
- But there might be timing issues

### Solution 3: Use database trigger with SECURITY DEFINER

Create a trigger function that automatically creates profiles:
- Uses `SECURITY DEFINER` to bypass RLS
- Runs automatically when user is created in `auth.users`
- Application code doesn't need to INSERT directly

---

## Summary

| Aspect | Before (Working) | Now (Broken) |
|--------|-----------------|--------------|
| **RLS Status** | Disabled OR lenient | ✅ Enabled with strict policy |
| **INSERT Policy** | Missing OR permissive | ✅ Strict `WITH CHECK (auth.uid() = id)` |
| **anon INSERT Permission** | Probably didn't matter | ⚠️ Has permission but can't satisfy policy |
| **authenticated INSERT Permission** | ✅ | ✅ |
| **Profile Creation Method** | Trigger OR direct INSERT | Direct INSERT only |

**Key Insight**: The strict RLS policy with `WITH CHECK` is **correct for security**, but `anon` having INSERT permission causes the timing issue. Revoke `anon` INSERT permission to fix it.

