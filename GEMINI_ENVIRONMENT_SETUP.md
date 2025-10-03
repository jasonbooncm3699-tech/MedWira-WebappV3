# 🔑 Gemini 1.5 Pro Environment Setup Guide

## ✅ **Your Existing Setup**

You already have a Gemini API key configured! Here's how to set it up for Gemini 1.5 Pro:

## 📁 **Create `.env.local` File**

Create a `.env.local` file in your project root with the following content:

```bash
# Gemini 1.5 Pro Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_existing_gemini_api_key_here

# Supabase Configuration (if not already set)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Legacy Gemini API Key (for backward compatibility)
NEXT_PUBLIC_GEMINI_API_KEY=your_existing_gemini_api_key_here

# Debug mode (optional)
DEBUG=true
```

## 🔄 **Migration from Existing Setup**

### **Step 1: Copy Your Existing API Key**
Your existing Gemini API key will work with Gemini 1.5 Pro. You just need to:

1. **Copy your existing API key** from your current setup
2. **Set it as `GOOGLE_GENERATIVE_AI_API_KEY`** in `.env.local`
3. **Keep `NEXT_PUBLIC_GEMINI_API_KEY`** for backward compatibility

### **Step 2: Environment Variable Priority**
The new Gemini agent service uses this priority:
1. `GOOGLE_GENERATIVE_AI_API_KEY` (primary for Gemini 1.5 Pro)
2. `NEXT_PUBLIC_GEMINI_API_KEY` (fallback for compatibility)

## 🚀 **Quick Setup Commands**

```bash
# 1. Create .env.local file
touch .env.local

# 2. Add your API key (replace with your actual key)
echo "GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here" >> .env.local
echo "NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here" >> .env.local

# 3. Add Supabase keys (if not already set)
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key" >> .env.local

# 4. Verify setup
npm run verify:gemini

# 5. Test integration
npm run test:gemini
```

## ✅ **Verification Steps**

### **1. Check Environment Variables**
```bash
# Verify your API key is set
echo $GOOGLE_GENERATIVE_AI_API_KEY
```

### **2. Run Verification Script**
```bash
npm run verify:gemini
```

### **3. Test Complete Pipeline**
```bash
npm run test:gemini
```

### **4. Test with Real API**
```bash
npm run test:pipeline
```

## 🔧 **API Key Requirements**

### **Your Existing API Key Works Because:**
- ✅ Gemini 1.5 Pro uses the same API key format
- ✅ Same Google AI Studio authentication
- ✅ Same rate limits and quotas
- ✅ Backward compatible with existing setup

### **What Changed:**
- 🔄 **SDK**: From `@google/generative-ai` to updated version
- 🔄 **Model**: Now using `gemini-1.5-pro` model
- 🔄 **Service**: New `geminiAgent.js` instead of old `gemini-service.ts`
- ✅ **API Key**: Same key, just different environment variable name

## 🚀 **Ready for Live Testing**

Once you set up the `.env.local` file:

1. **Verify Setup**: `npm run verify:gemini`
2. **Test Integration**: `npm run test:gemini`
3. **Start Development**: `npm run dev`
4. **Deploy to Production**: Push to git and deploy

## 🎯 **Next Steps**

1. **Create `.env.local`** with your existing API key
2. **Run verification** to ensure everything works
3. **Push to git** for live testing
4. **Deploy and test** with real medicine images

Your existing Gemini API key will work perfectly with Gemini 1.5 Pro!
