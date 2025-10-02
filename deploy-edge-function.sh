#!/bin/bash

# Deploy Supabase Edge Function for Medicine Analysis
echo "🚀 Deploying Supabase Edge Function: analyze-medicine"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please login first:"
    echo "   supabase login"
    exit 1
fi

# Deploy the Edge Function
echo "📦 Deploying analyze-medicine function..."
supabase functions deploy analyze-medicine

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Set up environment variables in Supabase Dashboard:"
    echo "   - GEMINI_API_KEY (or NEXT_PUBLIC_GEMINI_API_KEY)"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "2. Test the function:"
    echo "   curl -X POST 'https://your-project.supabase.co/functions/v1/analyze-medicine' \\"
    echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"imageBase64\":\"data:image/jpeg;base64,...\", \"userId\":\"user-id\"}'"
    echo ""
    echo "3. Update your frontend to use the new API endpoint"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
