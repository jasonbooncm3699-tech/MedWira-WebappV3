# MedWira AI - Deployment Guide

## Prerequisites

1. **Supabase Project**: Create a new project at [supabase.com](https://supabase.com)
2. **Google API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/)
3. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
4. **GitHub Repository**: Push your code to GitHub

## Step 1: Supabase Setup

### Create Database Table
Run this SQL in your Supabase SQL editor:

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

-- Create indexes for better performance
CREATE INDEX idx_medicines_product_name ON medicines(product_name);
CREATE INDEX idx_medicines_manufacturer ON medicines(manufacturer_name);
CREATE INDEX idx_medicines_generic_name ON medicines(generic_name);
```

### Get Supabase Credentials
1. Go to Settings > API in your Supabase dashboard
2. Copy the Project URL and anon/public key

## Step 2: Environment Variables

Create `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here

# Existing Gemini API (for backward compatibility)
GEMINI_API_KEY=your_google_api_key_here
```

## Step 3: Local Testing

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test the application
# 1. Visit http://localhost:3000
# 2. Click "Database" button to go to /medicines
# 3. Verify medicines load (if you have data)
# 4. Test AI analysis on individual medicines
```

## Step 4: Vercel Deployment

### Option A: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_API_KEY`
6. Deploy

### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add GOOGLE_API_KEY
```

## Step 5: Data Ingestion

### NPRA CSV Import
Use your existing MCP server to ingest NPRA data:

```python
# Example Python script to insert data
import pandas as pd
from supabase import create_client, Client

# Load CSV data
df = pd.read_csv('npra_data.csv')

# Connect to Supabase
url = "your_supabase_url"
key = "your_supabase_service_role_key"
supabase: Client = create_client(url, key)

# Insert data
for _, row in df.iterrows():
    supabase.table('medicines').insert({
        'registration_number': row['registration_number'],
        'product_name': row['product_name'],
        'holder_name': row['holder_name'],
        'manufacturer_name': row['manufacturer_name'],
        'dosage_form': row['dosage_form'],
        'strength': row['strength'],
        'generic_name': row['generic_name']
    }).execute()
```

## Step 6: Testing Production

1. **Database Connection**: Verify medicines load at `/medicines`
2. **AI Analysis**: Test individual medicine pages for AI enrichment
3. **Error Handling**: Verify fallback messages when AI is unavailable
4. **Performance**: Check page load times and responsiveness

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Check `.env.local` file exists
   - Verify variable names are correct
   - Restart development server

2. **"No medicines found"**
   - Run NPRA data ingestion
   - Check Supabase table has data
   - Verify database connection

3. **"AI analysis unavailable"**
   - Check `GOOGLE_API_KEY` is set
   - Verify API key is valid
   - Check console for error messages

4. **Vercel deployment fails**
   - Check environment variables are set in Vercel
   - Verify build logs for errors
   - Ensure all dependencies are in package.json

## Production Checklist

- [ ] Supabase project created and configured
- [ ] Database table created with proper schema
- [ ] Environment variables configured
- [ ] NPRA data ingested into Supabase
- [ ] Local testing completed
- [ ] Vercel deployment successful
- [ ] Production testing completed
- [ ] Custom domain configured (optional)
- [ ] Monitoring and logging set up (optional)

## Support

For issues:
1. Check browser console for errors
2. Check Vercel function logs
3. Verify Supabase connection
4. Test API keys independently
