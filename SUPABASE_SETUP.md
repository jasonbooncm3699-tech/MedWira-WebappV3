# Supabase Setup Guide

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login with your account
3. Click "New Project"
4. Fill in project details:
   - **Name**: `medwira-ai`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 🗄️ Step 2: Setup Database Schema

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy the contents from `database/schema.sql`
4. Paste and run the SQL script
5. Verify tables are created in **Table Editor**

## 🔑 Step 3: Get API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## ⚙️ Step 4: Configure Environment Variables

Add to your `.env.local` file:

```env
# Existing Gemini AI key
NEXT_PUBLIC_GEMINI_API_KEY=your_existing_gemini_key

# New Supabase keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Step 5: Deploy to Vercel

1. Go to your Vercel project settings
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy your project

## 📊 Step 6: Verify Setup

1. Check that tables exist in Supabase Table Editor:
   - ✅ `users`
   - ✅ `scan_history` 
   - ✅ `npra_medicines`
2. Test the connection by running your app locally
3. Check browser console for any Supabase connection errors

## 🔐 Security Notes

- ✅ Row Level Security (RLS) is enabled
- ✅ Users can only access their own data
- ✅ NPRA medicines are publicly readable
- ✅ All tables have proper indexes for performance

## 📈 Next Steps

Once Supabase is configured:
1. **User Authentication** - Connect Supabase Auth
2. **Payment System** - Add subscription tiers
3. **Business Features** - Admin dashboard and analytics

---

**Need Help?** Check the Supabase documentation or contact support.
