# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here

# Existing Gemini API (for backward compatibility)
GEMINI_API_KEY=your_google_api_key_here
```

## How to Get These Values:

### Supabase Setup:
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings > API
3. Copy the Project URL and anon/public key
4. Create a `medicines` table with the following schema:
   ```sql
   CREATE TABLE medicines (
     id SERIAL PRIMARY KEY,
     registration_number VARCHAR(50) UNIQUE NOT NULL,
     product_name TEXT,
     holder_name TEXT,
     manufacturer_name TEXT,
     dosage_form TEXT,
     strength TEXT,
     generic_name TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

### Google API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key to your environment variables

## Vercel Deployment:
Add these same environment variables in your Vercel project settings under Environment Variables.
