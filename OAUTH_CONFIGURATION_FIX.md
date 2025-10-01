# OAuth Configuration Fix Guide - "Unable to Exchange Code" Error

## 🚨 Error: "Authentication failed: Unable to exchange external code"

This error occurs when OAuth redirect URIs don't match or server-side code exchange fails.

---

## ✅ Solution: 3-Step Fix

### **Step 1: Install Required Package**

```bash
npm install @supabase/ssr
```

**Status:** ✅ **DONE** (just installed)

---

### **Step 2: Configure Supabase Redirect URLs**

#### **2.1 Go to Supabase Dashboard**

1. Open https://supabase.com/dashboard
2. Select your MedWira project
3. Go to **Authentication** → **URL Configuration**

#### **2.2 Set Site URL**

```
Site URL: https://medwira.com
```

**For Development:**
```
Site URL: http://localhost:3000
```

#### **2.3 Set Redirect URLs**

Add BOTH of these to "Redirect URLs" section:

```
https://medwira.com/auth/callback
http://localhost:3000/auth/callback
```

**Important:** 
- ✅ Include the `/auth/callback` path
- ✅ Include both http (dev) and https (prod)
- ✅ No trailing slashes
- ✅ Exact match required

#### **2.4 Screenshot of Correct Configuration**

```
┌─────────────────────────────────────────┐
│ URL Configuration                       │
├─────────────────────────────────────────┤
│ Site URL:                               │
│ https://medwira.com                     │
│                                         │
│ Redirect URLs:                          │
│ https://medwira.com/auth/callback       │
│ http://localhost:3000/auth/callback     │
│                                         │
│ [Save]                                  │
└─────────────────────────────────────────┘
```

---

### **Step 3: Configure Google OAuth Console**

#### **3.1 Go to Google Cloud Console**

1. Open https://console.cloud.google.com
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**

#### **3.2 Find OAuth 2.0 Client ID**

- Look for "OAuth 2.0 Client IDs" section
- Click on your client ID (or create new if none exists)

#### **3.3 Set Authorized Redirect URIs**

**CRITICAL:** Add the **Supabase Auth endpoint**, NOT your app URL:

```
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
http://localhost:54321/auth/v1/callback
```

**How to find YOUR-PROJECT-REF:**
- Go to Supabase dashboard
- Settings → API
- Look at "Project URL": `https://abcdefg.supabase.co`
- Your ref is: `abcdefg`

**Example:**
```
Authorized redirect URIs:
https://xyzproject.supabase.co/auth/v1/callback
http://localhost:54321/auth/v1/callback
```

**⚠️ Common Mistakes:**
- ❌ `https://medwira.com/auth/callback` (your app URL - WRONG!)
- ✅ `https://yourproject.supabase.co/auth/v1/callback` (Supabase - CORRECT!)

#### **3.4 Screenshot of Correct Google Console Setup**

```
┌─────────────────────────────────────────────────────┐
│ Authorized redirect URIs                            │
├─────────────────────────────────────────────────────┤
│ 1. https://xyzproject.supabase.co/auth/v1/callback  │
│ 2. http://localhost:54321/auth/v1/callback          │
│                                                     │
│ [+ ADD URI]                     [SAVE]              │
└─────────────────────────────────────────────────────┘
```

---

### **Step 4: Configure Google Provider in Supabase**

#### **4.1 Enable Google Provider**

1. Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** in the list
3. Toggle to **Enabled**

#### **4.2 Add Google Credentials**

```
Client ID: your-google-client-id.apps.googleusercontent.com
Client Secret: your-google-client-secret

[Save]
```

**Where to get these:**
- Google Cloud Console
- APIs & Services → Credentials
- Your OAuth 2.0 Client ID
- Copy Client ID and Client Secret

---

### **Step 5: Verify Environment Variables**

#### **5.1 Local Development (.env.local)**

Create or update `/Users/user/seamed-ai/.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Explicit site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google Gemini (for medicine analysis)
GOOGLE_API_KEY=your-gemini-api-key
GEMINI_API_KEY=your-gemini-api-key
```

**How to get Supabase credentials:**
1. Supabase Dashboard → Settings → API
2. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### **5.2 Vercel Production**

1. Go to https://vercel.com/dashboard
2. Select your MedWira project
3. Settings → Environment Variables
4. Add/update these variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
NEXT_PUBLIC_SITE_URL = https://medwira.com
```

**After adding:**
- Click "Redeploy" to apply changes
- Or push to git (auto-deploys)

---

## 🧪 Testing Steps

### **Test Script: Local Development**

```bash
# 1. Start development server
npm run dev

# 2. Open browser
open http://localhost:3000

# 3. Open browser console (F12)

# 4. Test Google OAuth:
- Click "Sign In / Sign Up"
- Click "Continue with Google"
- Watch console logs:
  Expected:
  "🔐 Starting google OAuth flow..."
  (Browser redirects to Google)
  (Select account & approve)
  (Browser redirects back)
  "🔐 OAuth Callback received: {hasCode: true, hasError: false}"
  "🔄 Exchanging authorization code for session..."
  "✅ Session created successfully: {userId, email}"
  "💾 Creating/updating user record..."
  "✅ User record created/updated successfully: {tokens: 30}"
  "🏠 Redirecting to home page..."
  
# 5. Verify result:
- Modal should close
- Header should show your name/email
- Dropdown should show "Tokens: 30"

# 6. Check Supabase dashboard:
- Authentication → Users → Should see new user
- Database → users table → Verify tokens = 30
```

### **Expected Console Logs (Success):**

```javascript
// Frontend (SocialAuthModal)
🔐 Starting google OAuth flow...
✅ google OAuth initiated successfully

// Backend (callback route)
🔐 OAuth Callback received: {hasCode: true, hasError: false, origin: "http://localhost:3000"}
🔄 Exchanging authorization code for session...
📝 Code (first 20 chars): 4/0AVG7fiQa1b2c3d4e...
✅ Session created successfully: {userId: "uuid-here", email: "user@gmail.com", provider: "google"}
💾 Creating/updating user record: {id: "uuid", email: "user@gmail.com", name: "John Doe"}
✅ User record created/updated successfully: {userId: "uuid", tokens: 30, tier: "free"}
🏠 Redirecting to home page...

// Frontend (auth-context)
🔄 Auth state changed: SIGNED_IN
✅ User authenticated: user@gmail.com
```

### **Expected Console Logs (Error - Before Fix):**

```javascript
❌ Code exchange failed: {
  error: "Unable to exchange external code : 4/0AVG7fiQ...",
  name: "AuthApiError",
  status: 400
}

// Redirects to:
http://localhost:3000?auth_error=exchange_failed&auth_error_description=Unable%20to%20exchange...
```

---

## 🔍 Troubleshooting

### **Error 1: "Unable to exchange external code"**

**Cause:** Redirect URI mismatch

**Check:**
```bash
# 1. Verify Supabase redirect URLs
Supabase Dashboard → Authentication → URL Configuration
Should have: http://localhost:3000/auth/callback

# 2. Verify Google Console redirect URIs
Google Console → Credentials → OAuth 2.0 Client
Should have: https://yourproject.supabase.co/auth/v1/callback

# 3. Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
# Should match your Supabase project URL
```

**Fix:**
- Ensure exact match (no trailing slashes)
- Include both http and https variants
- Wait 5 minutes after saving (propagation time)

---

### **Error 2: "OAuth provider not enabled"**

**Cause:** Google provider not configured in Supabase

**Fix:**
```
1. Supabase Dashboard → Authentication → Providers
2. Find Google → Toggle Enabled
3. Add Client ID and Client Secret from Google Console
4. Save
```

---

### **Error 3: "Invalid redirect URI"**

**Cause:** URI in code doesn't match Supabase configuration

**Check code:**
```tsx
// SocialAuthModal.tsx should have:
redirectTo: `${window.location.origin}/auth/callback`

// For localhost:3000, this becomes:
// http://localhost:3000/auth/callback

// This MUST be in Supabase redirect URLs!
```

**Fix:**
- Add exact URL to Supabase dashboard
- Restart dev server: `npm run dev`

---

### **Error 4: "@supabase/ssr not found"**

**Cause:** Package not installed

**Fix:**
```bash
npm install @supabase/ssr
npm run build  # Verify it works
```

---

### **Error 5: "Cookies not working"**

**Cause:** Server component can't set cookies

**Check:**
```tsx
// supabase-server.ts should have try/catch blocks
set(name, value, options) {
  try {
    cookieStore.set({ name, value, ...options })
  } catch (error) {
    // Ignore - middleware will handle
  }
}
```

**Status:** ✅ **Handled in code**

---

## 📋 Configuration Checklist

### **Supabase Dashboard**

- [ ] **URL Configuration:**
  - [ ] Site URL: `https://medwira.com` or `http://localhost:3000`
  - [ ] Redirect URLs include: `http://localhost:3000/auth/callback`
  - [ ] Redirect URLs include: `https://medwira.com/auth/callback`

- [ ] **Google Provider:**
  - [ ] Enabled: ✅
  - [ ] Client ID: Added from Google Console
  - [ ] Client Secret: Added from Google Console

- [ ] **Database:**
  - [ ] `users` table exists
  - [ ] RLS policies configured
  - [ ] `tokens` column has DEFAULT 30

### **Google Cloud Console**

- [ ] **OAuth 2.0 Client ID created**
- [ ] **Authorized redirect URIs include:**
  - [ ] `https://yourproject.supabase.co/auth/v1/callback`
  - [ ] `http://localhost:54321/auth/v1/callback` (for local)
- [ ] **OAuth consent screen configured**
- [ ] **Scopes include:** email, profile

### **Environment Variables**

**Local (.env.local):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set correctly
- [ ] `NEXT_PUBLIC_SITE_URL` - Optional but recommended

**Vercel:**
- [ ] Same variables added to Vercel dashboard
- [ ] Redeployed after adding variables

### **Code Files**

- [x] ✅ `/lib/supabase-server.ts` - Created
- [x] ✅ `/app/auth/callback/route.ts` - Updated with server client
- [x] ✅ `/components/SocialAuthModal.tsx` - Enhanced error handling
- [x] ✅ `@supabase/ssr` - Installed

---

## 🔧 Files Modified

### **1. Created: `/lib/supabase-server.ts`**

**Purpose:** Server-side Supabase client for OAuth callbacks

**Key Features:**
- Uses `@supabase/ssr` for proper server-side auth
- Cookie-based session management
- Handles Next.js 15 App Router properly

---

### **2. Updated: `/app/auth/callback/route.ts`**

**Before:**
```tsx
import { supabase } from '@/lib/supabase';  // ❌ Client-side

const { data, error } = await supabase.auth.exchangeCodeForSession(code);
// Fails because client-side supabase can't handle server OAuth
```

**After:**
```tsx
import { createClient } from '@/lib/supabase-server';  // ✅ Server-side

const supabase = createClient();  // Server client with cookies
const { data, error } = await supabase.auth.exchangeCodeForSession(code);
// Works! Proper server-side OAuth handling
```

**Improvements:**
- ✅ Uses server-side client (proper cookie handling)
- ✅ Enhanced logging (code, session, errors)
- ✅ Better error messages
- ✅ Detailed console logs for debugging
- ✅ Proper error parameter names (`auth_error`)

---

### **3. Updated: `/components/SocialAuthModal.tsx`**

**Improvements:**
- ✅ Handles new error parameter names (`auth_error`, `auth_error_description`)
- ✅ Specific error messages for each error type:
  - `exchange_failed` → "Check your internet connection..."
  - `no_code` → "OAuth code missing..."
  - `callback_exception` → "Error occurred during login..."
  - `access_denied` → "Login cancelled..."

---

## 🧪 Complete Testing Guide

### **Test 1: Verify Configuration**

```bash
# Check Supabase URL is set
node -e "console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Should output your project URL
```

### **Test 2: Test Local OAuth Flow**

```bash
# 1. Start server
npm run dev

# 2. Open browser with console
open http://localhost:3000

# 3. Open DevTools Console (F12 or Cmd+Option+I)

# 4. Click "Sign In / Sign Up"

# 5. Click "Continue with Google"

# 6. Monitor console logs:
```

**Expected Success Logs:**
```
Frontend:
🔐 Starting google OAuth flow...
✅ google OAuth initiated successfully

(Browser redirects to Google)
(User approves)
(Browser redirects back to /auth/callback)

Backend:
🔐 OAuth Callback received: {hasCode: true, hasError: false}
🔄 Exchanging authorization code for session...
📝 Code (first 20 chars): 4/0AVG7fiQa1b2c...
✅ Session created successfully: {userId: "...", email: "user@gmail.com"}
💾 Creating/updating user record: {id: "...", email: "...", name: "..."}
✅ User record created/updated successfully: {tokens: 30, tier: "free"}
🏠 Redirecting to home page...

Frontend:
🔄 Auth state changed: SIGNED_IN
✅ User authenticated: user@gmail.com
```

**Expected Error Logs (if config wrong):**
```
Backend:
❌ Code exchange failed: {
  error: "Unable to exchange external code...",
  name: "AuthApiError",
  status: 400
}

Frontend:
❌ OAuth callback error: {error: "exchange_failed", description: "..."}
```

---

### **Test 3: Verify Database**

```bash
# After successful signup:

# 1. Go to Supabase Dashboard
# 2. Database → Table Editor → users
# 3. Find your new user record

# Should see:
- id: UUID (matches auth.users.id)
- email: user@gmail.com
- name: "Your Name"
- tokens: 30  ⭐
- subscription_tier: "free"
- created_at: timestamp
```

---

### **Test 4: Test Cancellation Handling**

```bash
# 1. Click "Continue with Google"
# 2. Hit browser back button
# 3. Should see: "⚠️ Login cancelled..." error
# 4. Both buttons should be clickable again ✅
```

---

## 🐛 Common Errors & Solutions

### **Error: "Unable to exchange external code"**

**Root Cause:** Google redirect URI mismatch

**Solution:**
```
1. Google Console redirect URIs should point to Supabase:
   ✅ https://yourproject.supabase.co/auth/v1/callback
   ❌ NOT https://medwira.com/auth/callback

2. Supabase redirect URLs should point to your app:
   ✅ https://medwira.com/auth/callback
   ✅ http://localhost:3000/auth/callback

Think of it as:
Google → Supabase → Your App
```

---

### **Error: "redirect_uri_mismatch"**

**Displayed:** On Google's OAuth page

**Solution:**
```bash
# The redirectTo in your code should match Supabase config:
redirectTo: `${window.location.origin}/auth/callback`

# If localhost:3000, this becomes:
# http://localhost:3000/auth/callback

# This MUST be in:
# Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
```

---

### **Error: "Invalid client"**

**Cause:** Wrong Google Client ID or Secret

**Solution:**
```
1. Verify in Supabase Dashboard → Authentication → Providers → Google
2. Client ID should end with: .apps.googleusercontent.com
3. Client Secret should be a long random string
4. Copy directly from Google Console (no spaces!)
```

---

### **Error: "Session not created"**

**Cause:** Code exchange succeeded but session not set

**Debug:**
```tsx
// In callback route, check:
console.log('Session data:', data.session);
console.log('User:', data.session?.user);

// If null, check cookies:
console.log('Request cookies:', request.cookies.getAll());
```

**Solution:**
- Ensure supabase-server.ts is using cookies properly
- Verify Next.js 15 cookie handling
- Check browser isn't blocking cookies

---

## 📊 Verification Checklist

### **Before Testing:**

**Supabase:**
- [ ] Project created
- [ ] URL configuration set
- [ ] Google provider enabled
- [ ] Client ID & Secret added
- [ ] Redirect URLs configured

**Google Console:**
- [ ] OAuth client created
- [ ] Redirect URIs point to Supabase
- [ ] Consent screen configured
- [ ] Test users added (if in testing mode)

**Environment:**
- [ ] `.env.local` has SUPABASE_URL and ANON_KEY
- [ ] No typos in environment variables
- [ ] Server restarted after env changes

**Code:**
- [x] ✅ `@supabase/ssr` installed
- [x] ✅ `supabase-server.ts` created
- [x] ✅ `callback/route.ts` updated
- [x] ✅ `SocialAuthModal.tsx` handles new errors

---

## 🎯 Quick Debug Commands

```bash
# 1. Verify package installed
npm list @supabase/ssr
# Should show: @supabase/ssr@0.x.x

# 2. Check environment variables
cat .env.local | grep SUPABASE
# Should show both URL and ANON_KEY

# 3. Test build
npm run build
# Should compile with no errors

# 4. Check Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
supabase.from('users').select('count').then(d => console.log('DB Connected:', d));
"
```

---

## 📝 Summary of Changes

### **Files Created:**
1. ✅ `/lib/supabase-server.ts` - Server-side Supabase client

### **Files Updated:**
2. ✅ `/app/auth/callback/route.ts` - Enhanced with server client & logging
3. ✅ `/components/SocialAuthModal.tsx` - Better error handling

### **Packages Added:**
4. ✅ `@supabase/ssr@latest` - Server-side auth helpers

### **Configuration Needed:**
5. ⏳ Supabase redirect URLs
6. ⏳ Google Console redirect URIs
7. ⏳ Environment variables (if missing)

---

## 🚀 Deploy to Vercel

```bash
# 1. Commit changes (already done)
git status

# 2. Push to GitHub
git push origin main

# 3. Vercel auto-deploys

# 4. Verify environment variables in Vercel dashboard

# 5. Test production OAuth:
open https://medwira.com
# Try Google signup
```

---

## ✅ Expected Result After Fix

### **Before:**
```
Click Google → Error: "Unable to exchange external code..."
```

### **After:**
```
Click Google → 
  Loading → 
  Google page → 
  Approve → 
  Redirects back → 
  ✅ Logged in! 
  ✅ Tokens: 30 
  ✅ Modal closed
```

---

## 📞 Support

If still not working after following this guide:

1. **Check Supabase Logs:**
   - Supabase Dashboard → Logs → Auth Logs
   - Look for failed OAuth attempts

2. **Check Network Tab:**
   - Browser DevTools → Network
   - Look for `/auth/callback` request
   - Check response status

3. **Verify URLs Match:**
   ```
   Your app callback: http://localhost:3000/auth/callback
   ↓ Configured in Supabase redirect URLs
   
   Google redirect: https://xyz.supabase.co/auth/v1/callback
   ↓ Configured in Google Console
   ```

---

**The OAuth flow should now work correctly!** 🎉

**Next:** Test with `npm run dev` and signup with Google!

