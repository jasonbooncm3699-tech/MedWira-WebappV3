# OAuth "Unable to Exchange Code" - Before & After Fix

## 🐛 The Problem

**Error Message:**
```
Authentication failed: Unable to exchange external code : 4/0AVG7fiQ...
```

**User Experience:**
- Click "Continue with Google"
- Approve on Google's page
- Redirected back to MedWira
- ❌ Error shown in modal
- ❌ Not logged in
- ❌ No session created

**Root Cause:**
- Using **client-side** Supabase client in server-side OAuth callback
- Client-side instance cannot properly exchange authorization codes
- Cookie-based session not being set correctly

---

## ✅ The Solution

### **What Changed**

**Before:**
```tsx
// app/auth/callback/route.ts
import { supabase } from '@/lib/supabase';  // ❌ Client-side instance

export async function GET(request: NextRequest) {
  const code = searchParams.get('code');
  
  // Using client-side supabase in server route
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // ❌ Fails! Client instance can't handle server OAuth
}
```

**After:**
```tsx
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase-server';  // ✅ Server-side factory

export async function GET(request: NextRequest) {
  const code = searchParams.get('code');
  
  // Create proper server-side client with cookie handling
  const supabase = await createClient();
  
  // Exchange code using server client
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // ✅ Works! Proper server-side OAuth handling
}
```

---

## 📝 Files Created/Modified

### **1. Created: `/lib/supabase-server.ts`** ✨

**Purpose:** Factory function for server-side Supabase clients

```tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()  // ⭐ Next.js 15 async API

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Server Component call - safely ignored
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Server Component call - safely ignored
          }
        },
      },
    }
  )
}
```

**Key Features:**
- ✅ Uses `@supabase/ssr` (server-side package)
- ✅ Properly handles Next.js 15 async cookies
- ✅ Sets httpOnly cookies for session
- ✅ Error handling for Server Component calls

---

### **2. Updated: `/app/auth/callback/route.ts`** 🔧

#### **BEFORE (Broken):**

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';  // ❌ Wrong client

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('❌ OAuth callback error:', error);
      return NextResponse.redirect(...);
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(...);
    }

    console.log('🔐 Processing OAuth callback with code:', code.substring(0, 10));

    // ❌ PROBLEM: Using client-side supabase
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    // This fails because client-side instance can't exchange codes properly

    if (exchangeError) {
      console.error('❌ Code exchange error:', exchangeError.message);
      return NextResponse.redirect(...);
    }

    // ... rest of code
  } catch (error) {
    console.error('💥 OAuth callback exception:', error);
    return NextResponse.redirect(...);
  }
}
```

**Problems:**
- ❌ Client-side Supabase instance
- ❌ Insufficient logging
- ❌ Generic error parameter names
- ❌ No detailed error information

---

#### **AFTER (Fixed):**

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';  // ✅ Server client

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  const origin = requestUrl.origin;
  const redirectUrl = `${origin}`;

  // ✅ Enhanced logging
  console.log('🔐 OAuth Callback received:', {
    hasCode: !!code,
    hasError: !!error,
    origin,
    timestamp: new Date().toISOString()
  });

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth provider error:', {
      error,
      description: errorDescription,
      timestamp: new Date().toISOString()
    });
    
    // ✅ Better error parameter names
    return NextResponse.redirect(
      `${redirectUrl}?auth_error=${encodeURIComponent(error)}&auth_error_description=${encodeURIComponent(errorDescription || '')}`
    );
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(`${redirectUrl}?auth_error=no_code`);
  }

  try {
    // ✅ Create proper server-side client
    const supabase = await createClient();

    console.log('🔄 Exchanging authorization code for session...');
    console.log('📝 Code (first 20 chars):', code.substring(0, 20) + '...');

    // ✅ Exchange code with proper server client
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      // ✅ Detailed error logging
      console.error('❌ Code exchange failed:', {
        error: exchangeError.message,
        name: exchangeError.name,
        status: exchangeError.status,
        timestamp: new Date().toISOString()
      });

      return NextResponse.redirect(
        `${redirectUrl}?auth_error=exchange_failed&auth_error_description=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.session) {
      console.error('❌ No session returned after code exchange');
      return NextResponse.redirect(`${redirectUrl}?auth_error=no_session`);
    }

    const user = data.session.user;
    
    // ✅ Enhanced success logging
    console.log('✅ Session created successfully:', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      timestamp: new Date().toISOString()
    });

    // Create user record with detailed logging
    const userName = 
      user.user_metadata?.full_name || 
      user.user_metadata?.name || 
      user.email?.split('@')[0] ||
      'User';

    console.log('💾 Creating/updating user record:', {
      id: user.id,
      email: user.email,
      name: userName
    });

    const { data: upsertData, error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: userName,
        tokens: 30,
        subscription_tier: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      // ✅ Detailed DB error logging
      console.error('⚠️ Failed to upsert user record:', {
        error: upsertError.message,
        code: upsertError.code,
        details: upsertError.details
      });
    } else {
      console.log('✅ User record created/updated successfully:', {
        userId: upsertData?.id,
        tokens: upsertData?.tokens,
        tier: upsertData?.subscription_tier
      });
    }

    console.log('🏠 Redirecting to home page...');
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    // ✅ Enhanced exception logging
    console.error('💥 OAuth callback exception:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.redirect(
      `${redirectUrl}?auth_error=callback_exception&auth_error_description=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}
```

**Improvements:**
- ✅ Uses server-side Supabase client
- ✅ Detailed console logging at every step
- ✅ Better error parameter names (`auth_error`)
- ✅ Enhanced error messages
- ✅ Timestamps on all logs
- ✅ Full error details (name, status, stack)

---

### **3. Updated: `/components/SocialAuthModal.tsx`** 💬

#### **Error Handling Enhancement:**

```tsx
// Now handles new error parameter names
const urlError = urlParams.get('error') || urlParams.get('auth_error');
const urlErrorDescription = urlParams.get('error_description') || 
                            urlParams.get('auth_error_description');

// Specific error messages
if (error === 'exchange_failed') {
  friendlyMessage = 'Authentication failed. Please check your internet connection and try again.';
} else if (error === 'no_code') {
  friendlyMessage = 'OAuth code missing. Please try again.';
} else if (error === 'callback_exception') {
  friendlyMessage = 'An error occurred during login. Please try again.';
}
```

---

## 📦 Package Added

```bash
npm install @supabase/ssr
```

**Package:** `@supabase/ssr@latest`
**Purpose:** Server-side Supabase client with cookie handling
**Size:** ~2 packages added
**Required for:** Next.js 15 + Supabase OAuth

---

## 🔧 Configuration Required

### **Step 1: Supabase Dashboard**

**Location:** https://supabase.com/dashboard → Your Project

#### **A. URL Configuration:**
```
Authentication → URL Configuration

Site URL:
http://localhost:3000  (for development)
https://medwira.com    (for production)

Redirect URLs (add both):
http://localhost:3000/auth/callback
https://medwira.com/auth/callback
```

#### **B. Google Provider:**
```
Authentication → Providers → Google

Enabled: ✅ Toggle ON

Client ID (from Google Console):
123456789-abc.apps.googleusercontent.com

Client Secret (from Google Console):
GOCSPX-xxxxxxxxxxxxxxxxxxxx

[Save]
```

---

### **Step 2: Google Cloud Console**

**Location:** https://console.cloud.google.com

#### **A. Create OAuth Credentials (if not exists):**
```
APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID

Application type: Web application
Name: MedWira

Authorized JavaScript origins:
http://localhost:3000
https://medwira.com

Authorized redirect URIs: ⭐ IMPORTANT
https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback
http://localhost:54321/auth/v1/callback

[Create]
```

**⚠️ CRITICAL:** Redirect URIs must point to **Supabase**, not your app!

**Example:**
```
If your Supabase URL is: https://xyzproject.supabase.co
Then redirect URI is: https://xyzproject.supabase.co/auth/v1/callback
                                                      ^^^^^^^^^^^^
                                            This is the Supabase Auth endpoint!
```

---

## 🧪 Testing Instructions

### **Test Script:**

```bash
# 1. Start development server
npm run dev

# 2. Open browser with console
open http://localhost:3000

# 3. Open DevTools Console (Cmd+Option+I or F12)

# 4. Clear console for clean logs
# Click trash icon in console

# 5. Test Google OAuth signup:
# - Click "Sign In / Sign Up" button
# - Click "Continue with Google"
# - Select your Google account
# - Click "Allow" or "Continue"

# 6. Watch console logs (should see):
```

**Expected Success Console Output:**

```javascript
// FRONTEND (SocialAuthModal):
🔐 Starting google OAuth flow...
✅ google OAuth initiated successfully

// (Browser redirects to Google)
// (User approves)
// (Browser redirects to /auth/callback)

// BACKEND (Callback Route):
🔐 OAuth Callback received: {
  hasCode: true,
  hasError: false,
  origin: "http://localhost:3000",
  timestamp: "2025-10-01T12:00:00.000Z"
}
🔄 Exchanging authorization code for session...
📝 Code (first 20 chars): 4/0AVG7fiQa1b2c3d4e...
✅ Session created successfully: {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: "user@gmail.com",
  provider: "google",
  timestamp: "2025-10-01T12:00:05.000Z"
}
💾 Creating/updating user record: {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "user@gmail.com",
  name: "John Doe"
}
✅ User record created/updated successfully: {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  tokens: 30,
  tier: "free"
}
🏠 Redirecting to home page...

// FRONTEND (AuthContext):
🔄 Auth state changed: SIGNED_IN
✅ User authenticated: user@gmail.com
✅ User data loaded: user@gmail.com

// RESULT:
// ✅ Modal closes
// ✅ Header shows: "John Doe"
// ✅ Dropdown shows: "Tokens: 30"
```

**Expected Error Console Output (if config wrong):**

```javascript
// BACKEND:
❌ Code exchange failed: {
  error: "Unable to exchange external code...",
  name: "AuthApiError",
  status: 400,
  timestamp: "2025-10-01T12:00:00.000Z"
}

// FRONTEND:
❌ OAuth callback error: {
  error: "exchange_failed",
  description: "Unable to exchange external code...",
  timestamp: "2025-10-01T12:00:00.000Z"
}

// MODAL SHOWS:
⚠️ Authentication failed. Please check your internet connection and try again.
```

---

### **Verify in Supabase Dashboard:**

```bash
# After successful signup:

# 1. Go to Supabase Dashboard
# 2. Authentication → Users
# 3. Should see new user with:
#    - Email: user@gmail.com
#    - Provider: google
#    - Created: just now

# 4. Database → Table Editor → users
# 5. Should see record with:
#    - id: UUID (matches auth.users)
#    - email: user@gmail.com
#    - name: "John Doe"
#    - tokens: 30 ⭐
#    - subscription_tier: "free"
```

---

## 🔍 Debugging

### **If Still Getting "Unable to Exchange Code" Error:**

#### **Debug 1: Check Redirect URIs**

```bash
# Your Code:
# SocialAuthModal.tsx sends:
redirectTo: `${window.location.origin}/auth/callback`

# For localhost:3000, this is:
http://localhost:3000/auth/callback

# ✅ This MUST be in Supabase → Authentication → URL Configuration → Redirect URLs
```

**Verify:**
```
Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
Should contain: http://localhost:3000/auth/callback
```

#### **Debug 2: Check Google Console URIs**

```bash
# Google Console → Credentials → OAuth 2.0 Client ID

# ✅ Should contain Supabase auth endpoint:
https://yourproject.supabase.co/auth/v1/callback

# ❌ Should NOT contain your app URL:
https://medwira.com/auth/callback (WRONG!)
```

**The flow is:**
```
Your App → Sends user to Google
Google → Redirects to Supabase (/auth/v1/callback)
Supabase → Redirects to Your App (/auth/callback with code)
Your App → Exchanges code for session
```

#### **Debug 3: Check Environment Variables**

```bash
# Verify in terminal:
cat .env.local | grep SUPABASE

# Should show:
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Verify they're loaded:
npm run dev
# Should see in output: "- Environments: .env.local"
```

#### **Debug 4: Check Package Installation**

```bash
# Verify @supabase/ssr is installed:
npm list @supabase/ssr

# Should show:
# medwira-ai@0.1.0
# └── @supabase/ssr@0.5.2 (or similar)

# If not installed:
npm install @supabase/ssr
```

---

## 📊 Comparison Table

| Aspect | Before (Broken) | After (Fixed) |
|--------|----------------|---------------|
| **Supabase Client** | Client-side (`/lib/supabase`) | Server-side (`/lib/supabase-server`) |
| **Cookie Handling** | ❌ No cookie support | ✅ Proper cookie management |
| **Code Exchange** | ❌ Fails (client can't exchange) | ✅ Works (server can exchange) |
| **Error Logging** | Basic (error message only) | Detailed (name, status, stack, timestamp) |
| **Error Parameters** | `?error=...` | `?auth_error=...` (more specific) |
| **Session Creation** | ❌ Fails | ✅ Creates session + cookies |
| **User Experience** | Error message in modal | Successful login + 30 tokens |

---

## ✅ What You Get After Fix

### **Successful OAuth Flow:**

```
1. User clicks "Continue with Google"
   ✅ Button shows "Connecting..."

2. Browser redirects to Google
   ✅ User selects account & approves

3. Google redirects to Supabase
   ✅ Supabase validates & redirects to your app

4. Your app receives code
   ✅ /auth/callback processes request
   ✅ Server client exchanges code for session
   ✅ Session created with cookies
   ✅ User record created in database
   ✅ 30 tokens awarded

5. User redirected to home page
   ✅ Modal closes automatically
   ✅ Header shows user name
   ✅ Dropdown shows tokens: 30
   ✅ Ready to scan medicines!
```

**Total Time:** 5-10 seconds
**User Clicks:** 2-3 clicks
**Experience:** Smooth, professional ✨

---

## 🚀 Deployment

### **Before Deploying to Production:**

**1. Update Vercel Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL = https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
NEXT_PUBLIC_SITE_URL = https://medwira.com
```

**2. Update Supabase Redirect URLs:**
```
Add: https://medwira.com/auth/callback
```

**3. Update Google Console Redirect URIs:**
```
Already has: https://yourproject.supabase.co/auth/v1/callback
(No change needed - same for prod and dev)
```

**4. Deploy:**
```bash
git add .
git commit -m "Fix OAuth code exchange with server-side client"
git push origin main
# Vercel auto-deploys
```

**5. Test Production:**
```
open https://medwira.com
# Try Google signup
# Check browser console for logs
```

---

## 📋 Final Checklist

### **Configuration:**
- [ ] `@supabase/ssr` installed
- [ ] Supabase Site URL configured
- [ ] Supabase Redirect URLs include `/auth/callback`
- [ ] Google Provider enabled in Supabase
- [ ] Google Client ID & Secret added to Supabase
- [ ] Google Console redirect URIs point to Supabase
- [ ] Environment variables set (local & Vercel)

### **Code:**
- [x] ✅ `/lib/supabase-server.ts` created
- [x] ✅ `/app/auth/callback/route.ts` uses server client
- [x] ✅ `/components/SocialAuthModal.tsx` handles new errors
- [x] ✅ Build successful (no TypeScript errors)

### **Testing:**
- [ ] Local: Google signup works
- [ ] Local: Facebook signup works (if configured)
- [ ] Local: Check console logs match expected
- [ ] Local: Verify tokens awarded (30)
- [ ] Production: Test after deployment

---

## 🎉 Expected Result

### **Before Fix:**
```
Click Google → 
  Loading → 
  Google page → 
  Approve → 
  Redirects back → 
  ❌ Error: "Unable to exchange code..."
```

### **After Fix:**
```
Click Google → 
  Loading → 
  Google page → 
  Approve → 
  Redirects back → 
  ✅ Modal closes
  ✅ Logged in
  ✅ 30 tokens awarded
  ✅ Name displayed in header
```

---

## 💡 Key Takeaways

1. **Server vs Client:** OAuth callbacks MUST use server-side Supabase client
2. **Redirect URIs:** Google points to Supabase, Supabase points to your app
3. **Cookies:** Server client properly handles httpOnly cookies for sessions
4. **Logging:** Enhanced logging helps debug configuration issues
5. **Error Handling:** Specific error messages guide users and developers

---

**Your OAuth should now work perfectly!** 🚀

**Next Step:** Run `npm run dev` and test Google signup!

