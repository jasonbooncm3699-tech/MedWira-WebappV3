#!/bin/bash

# Environment Setup Script for MedWira AI
echo "🔧 Setting up environment variables for MedWira AI..."

# Create .env.local file
cat > .env.local << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://mpnmdjnpfkyntbihhtxu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbm1kam5wZmt5bnRiaWhodHh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgwNjM4OCwiZXhwIjoyMDc0MzgyMzg4fQ.bXCSurKqWLE0Jzg8fxhtjnT94b_XWN9cje2LfihoYz4

# Supabase Anon Key (you need to get this from your Supabase dashboard)
SUPABASE_ANON_KEY=your_anon_key_here

# Google Gemini API Key (if you have one)
GOOGLE_API_KEY=your_gemini_api_key_here

# Next.js Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mpnmdjnpfkyntbihhtxu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EOF

echo "✅ Created .env.local file"
echo ""
echo "⚠️  IMPORTANT: You still need to:"
echo "1. Get your Supabase Anon Key from https://supabase.com/dashboard"
echo "2. Replace 'your_anon_key_here' with the actual anon key"
echo "3. Add your Google Gemini API key if you have one"
echo ""
echo "🔍 To get your Supabase Anon Key:"
echo "1. Go to https://supabase.com/dashboard"
echo "2. Select project: mpnmdjnpfkyntbihhtxu"
echo "3. Go to Settings → API"
echo "4. Copy the 'anon public' key"
echo ""
echo "🚀 After updating .env.local, restart your development server:"
echo "npm run dev"
