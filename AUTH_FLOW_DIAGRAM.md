# MedWira Authentication Flow - Social Login Only

## 🔄 Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       USER JOURNEY                          │
└─────────────────────────────────────────────────────────────┘

1. USER VISITS APP
   │
   ▼
┌──────────────────┐
│   Home Page      │
│  (Not Logged In) │
└──────────────────┘
   │
   │ Clicks "Sign In / Sign Up"
   ▼
┌──────────────────────────────────┐
│    Social Auth Modal Opens       │
│                                  │
│  ┌────────────────────────────┐ │
│  │ [G] Continue with Google   │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ [f] Continue with Facebook │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
   │
   │ User clicks Google or Facebook
   ▼
┌──────────────────────────────────┐
│  Redirect to OAuth Provider      │
│  (Google or Facebook)            │
└──────────────────────────────────┘
   │
   │ User signs in with provider
   ▼
┌──────────────────────────────────┐
│   OAuth Provider Returns         │
│   Authorization Code             │
└──────────────────────────────────┘
   │
   │ Redirects to /auth/callback?code=xxx
   ▼
┌──────────────────────────────────┐
│   Callback Route Handler         │
│   /app/auth/callback/route.ts    │
│                                  │
│  1. Exchange code for session    │
│  2. Create/update user in DB     │
│  3. Set session cookies          │
└──────────────────────────────────┘
   │
   │ Redirects to home page
   ▼
┌──────────────────────────────────┐
│   Home Page (Logged In)          │
│                                  │
│   ✅ User authenticated          │
│   ✅ Session active              │
│   ✅ User data loaded            │
└──────────────────────────────────┘
```

## 📊 Technical Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TECHNICAL STACK                          │
└─────────────────────────────────────────────────────────────┘

FRONTEND (Next.js 15)
├── app/page.tsx
│   ├── Shows "Sign In / Sign Up" button
│   └── Opens SocialAuthModal
│
├── components/SocialAuthModal.tsx
│   ├── Renders Google & Facebook buttons
│   ├── Calls supabase.auth.signInWithOAuth()
│   └── Redirects to OAuth provider
│
└── lib/auth-context.tsx
    ├── Manages user state
    ├── Listens to auth state changes
    └── Handles session management

         ↕️ (API Calls)

SUPABASE AUTH
├── OAuth Providers
│   ├── Google OAuth 2.0
│   └── Facebook OAuth 2.0
│
├── Session Management
│   ├── JWT tokens
│   └── Refresh tokens
│
└── Database
    └── users table
        ├── id (UUID from Supabase Auth)
        ├── email
        ├── name
        ├── tokens (30 free tokens)
        └── subscription_tier

         ↕️ (Callbacks)

BACKEND (Next.js API Routes)
└── app/auth/callback/route.ts
    ├── Receives OAuth code
    ├── Exchanges code for session
    ├── Creates/updates user record
    └── Redirects to home page
```

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  SECURITY & PRIVACY                         │
└─────────────────────────────────────────────────────────────┘

1. USER INITIATES LOGIN
   ↓
2. APP REQUESTS OAUTH
   - No password entered in MedWira
   - No password stored in MedWira
   ↓
3. REDIRECT TO PROVIDER
   - HTTPS secure connection
   - Provider's login page
   ↓
4. PROVIDER AUTHENTICATES
   - User enters credentials on provider's site
   - Provider may use 2FA
   ↓
5. PROVIDER RETURNS AUTH CODE
   - One-time use code
   - Short expiration (10 minutes)
   ↓
6. APP EXCHANGES CODE FOR SESSION
   - Server-side exchange
   - Validates code authenticity
   ↓
7. SESSION CREATED
   - JWT token stored in httpOnly cookie
   - Refresh token for session renewal
   ↓
8. USER AUTHENTICATED
   - Session persists across page loads
   - Auto-refresh before expiration
```

## 📱 State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT                          │
└─────────────────────────────────────────────────────────────┘

AuthContext (lib/auth-context.tsx)
│
├── State Variables
│   ├── user: User | null
│   └── isLoading: boolean
│
├── Effects
│   ├── useEffect: Check existing session on mount
│   └── useEffect: Listen to auth state changes
│
└── Functions
    ├── logout(): Sign out user
    └── updateTokens(): Update user token count

    ↓ Provides to App

Components Using Auth
├── app/page.tsx
│   ├── Shows user info if logged in
│   └── Shows "Sign In" button if not
│
├── components/SocialAuthModal.tsx
│   └── Handles OAuth flow
│
└── Any component needing auth
    └── const { user, logout } = useAuth()
```

## 🌐 Multi-Language Support Flow

```
┌─────────────────────────────────────────────────────────────┐
│              MULTI-LANGUAGE INTEGRATION                     │
└─────────────────────────────────────────────────────────────┘

Modal Text (Dynamic)
├── English: "Sign In to MedWira"
├── Chinese: "登录 MedWira"
├── Malay: "Log Masuk ke MedWira"
├── Indonesian: "Masuk ke MedWira"
├── Thai: "เข้าสู่ระบบ MedWira"
├── Vietnamese: "Đăng nhập MedWira"
├── Tagalog: "Mag-sign in sa MedWira"
├── Burmese: "MedWira သို့ လော့ဂ်အင်ဝင်ရန်"
├── Khmer: "ចូលទៅកាន់ MedWira"
└── Lao: "ເຂົ້າສູ່ລະບົບ MedWira"

Note: OAuth buttons remain in English
(Google/Facebook branding requirements)
```

## 📈 Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING                            │
└─────────────────────────────────────────────────────────────┘

Error Scenarios
│
├── 1. OAuth Provider Error
│   ↓
│   User clicks Google/Facebook
│   ↓
│   Provider returns error
│   ↓
│   Show error in modal
│   └── "Google login failed: [error message]"
│
├── 2. Callback Error
│   ↓
│   OAuth returns to /auth/callback
│   ↓
│   Code exchange fails
│   ↓
│   Redirect to home with error param
│   └── "?error=callback_error"
│
├── 3. Database Error
│   ↓
│   User created in Supabase Auth
│   ↓
│   Database insert fails
│   ↓
│   Log warning, continue anyway
│   └── User still authenticated
│
└── 4. Network Error
    ↓
    Request times out
    ↓
    Show error in modal
    └── "Connection failed. Please try again."
```

## 🔄 Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                  SESSION LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

LOGIN
  ↓
SESSION CREATED
├── JWT token (1 hour expiry)
├── Refresh token (30 days expiry)
└── Stored in httpOnly cookies
  ↓
SESSION ACTIVE
├── User can access protected features
├── Token sent with each request
└── Auto-refresh before expiry
  ↓
SESSION REFRESH (before expiry)
├── Supabase auto-refreshes
├── New JWT issued
└── User stays logged in
  ↓
LOGOUT (manual)
├── User clicks "Sign Out"
├── supabase.auth.signOut()
├── Cookies cleared
└── User state set to null
  ↓
SESSION EXPIRED (no refresh)
├── Tokens expire
├── User logged out automatically
└── Redirect to login
```

## 🎨 UI Component Tree

```
┌─────────────────────────────────────────────────────────────┐
│                  COMPONENT HIERARCHY                        │
└─────────────────────────────────────────────────────────────┘

app/layout.tsx
└── AuthProvider (lib/auth-context.tsx)
    └── app/page.tsx
        ├── Header
        │   ├── Language Selector
        │   └── Auth Button
        │       └── onClick: setShowAuthModal(true)
        │
        ├── Chat Container
        │   └── (Medicine analysis features)
        │
        └── SocialAuthModal
            ├── Props: isOpen, onClose, mode
            │
            ├── Modal Header
            │   ├── Title (dynamic based on mode)
            │   ├── Description
            │   └── Close Button
            │
            ├── Social Buttons
            │   ├── Google Button
            │   │   └── onClick: handleSocialLogin('google')
            │   │
            │   └── Facebook Button
            │       └── onClick: handleSocialLogin('facebook')
            │
            ├── Error Message (conditional)
            │
            ├── Terms & Privacy
            │
            └── Info Banner
```

## 🚦 Request Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────┐
│              DETAILED REQUEST FLOW                          │
└─────────────────────────────────────────────────────────────┘

Step 1: User clicks "Continue with Google"
├── Frontend: handleSocialLogin('google')
├── setSocialLoading('google')
├── supabase.auth.signInWithOAuth({
│     provider: 'google',
│     options: {
│       redirectTo: 'http://localhost:3000/auth/callback'
│     }
│   })
└── Browser redirects to Google

Step 2: Google OAuth Page
├── User enters Google credentials
├── User approves permissions
└── Google generates authorization code

Step 3: Google redirects back
├── URL: /auth/callback?code=AUTH_CODE
└── Next.js API route handles request

Step 4: Callback Handler (server-side)
├── Extract code from URL
├── supabase.auth.exchangeCodeForSession(code)
├── Receive: { session, user }
├── Upsert user to database
│   ├── id: user.id (from Supabase Auth)
│   ├── email: user.email
│   ├── name: user.user_metadata.full_name
│   ├── tokens: 30
│   └── subscription_tier: 'free'
└── Redirect to home page

Step 5: Home Page Load
├── AuthContext checks session
├── supabase.auth.getSession()
├── Receive existing session
├── Load user from database
├── Set user state
└── Render authenticated UI
```

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA FLOW                               │
└─────────────────────────────────────────────────────────────┘

User Object
│
├── Source: Supabase Auth
│   ├── id: UUID
│   ├── email: string
│   ├── user_metadata: object
│   │   ├── full_name
│   │   ├── avatar_url
│   │   └── provider (google/facebook)
│   └── created_at: timestamp
│
└── Stored in: users table (Supabase DB)
    ├── id: UUID (matches auth.users.id)
    ├── email: string
    ├── name: string
    ├── tokens: integer (default: 30)
    ├── subscription_tier: string (default: 'free')
    ├── created_at: timestamp
    ├── updated_at: timestamp
    └── last_login: timestamp

    ↓ Loaded into

AuthContext State
├── user: User | null
│   ├── id
│   ├── email
│   ├── name
│   ├── tokens
│   └── subscription_tier
│
└── isLoading: boolean

    ↓ Consumed by

Components
├── Header: Shows user name/email
├── Dropdown: Shows tokens & tier
└── API Routes: Check user tokens
```

---

## 🎯 Key Takeaways

1. **Simple Flow**: User → Modal → OAuth → Callback → Home
2. **Secure**: No passwords in MedWira, OAuth handles security
3. **Automatic**: Session management handled by Supabase
4. **Responsive**: Works on all devices
5. **Multi-language**: Modal text adapts to user's language
6. **Error-proof**: Graceful error handling at every step

---

## 🔍 Debugging Tips

### Check These in Browser DevTools:

**Console Logs:**
```
✅ "🔐 Starting google OAuth flow..."
✅ "✅ google OAuth initiated successfully"
✅ "🔐 Processing OAuth callback with code: abc123..."
✅ "✅ OAuth authentication successful for: user@example.com"
✅ "✅ User record created/updated in database"
✅ "🔍 Checking existing session..."
✅ "✅ Found existing session for: user@example.com"
```

**Network Tab:**
- POST to Supabase auth endpoint
- Redirect to Google/Facebook
- GET to /auth/callback
- Database upsert request

**Application Tab (Cookies):**
- `sb-[project]-auth-token`
- httpOnly: true
- Secure: true (in production)

**React DevTools:**
- AuthContext → user state populated
- SocialAuthModal → socialLoading state
- Components receiving user prop

This flow ensures a smooth, secure, and user-friendly authentication experience! 🎉

