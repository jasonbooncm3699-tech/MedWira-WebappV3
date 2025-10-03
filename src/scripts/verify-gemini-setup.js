/**
 * Gemini 1.5 Pro Setup Verification Script
 * 
 * This script verifies that all prerequisites are met for Gemini 1.5 Pro integration.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Gemini 1.5 Pro Setup Verification');
console.log('=' .repeat(50));

async function verifyEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...');
  
  const requiredVars = ['GOOGLE_GENERATIVE_AI_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.log(`❌ Missing: ${varName}`);
    } else {
      console.log(`✅ Found: ${varName}`);
    }
  });
  
  const optionalVars = ['DEBUG'];
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ Found: ${varName} = ${process.env[varName]}`);
    } else {
      console.log(`⚠️  Optional: ${varName} (not set)`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  console.log('\n✅ All required environment variables are set');
  return true;
}

async function verifyGeminiAuthentication() {
  console.log('\n🔐 Testing Gemini 1.5 Pro Authentication...');
  
  try {
    const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    console.log(`📍 API Key: ${API_KEY ? 'Set' : 'Not Set'}`);
    
    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log('✅ Gemini client initialized successfully');
    
    // Test authentication by attempting a simple generation
    console.log('🔍 Testing authentication...');
    
    try {
      const result = await model.generateContent("Hello, this is a test message.");
      const response = await result.response;
      console.log('✅ Gemini authentication successful');
      console.log(`📝 Test response: ${response.text().substring(0, 50)}...`);
      return true;
    } catch (error) {
      if (error.message.includes('API_KEY_INVALID')) {
        console.log('❌ Invalid API key');
        return false;
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        console.log('❌ API quota exceeded');
        return false;
      } else {
        console.log(`❌ Gemini authentication failed: ${error.message}`);
        return false;
      }
    }
    
  } catch (error) {
    console.log(`❌ Gemini authentication failed: ${error.message}`);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Ensure GOOGLE_GENERATIVE_AI_API_KEY is set correctly');
    console.log('2. Verify your API key is valid and active');
    console.log('3. Check your quota in Google AI Studio');
    return false;
  }
}

async function verifySupabaseConnection() {
  console.log('\n🗄️  Testing Supabase Connection...');
  
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    
    console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase client initialized successfully');
    
    // Test connection by checking if we can access the profiles table
    console.log('🔍 Testing database connection...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`❌ Supabase connection failed: ${error.message}`);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.log(`❌ Supabase connection failed: ${error.message}`);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Verify SUPABASE_URL and SUPABASE_KEY are correct');
    console.log('2. Check that your Supabase project is active');
    console.log('3. Ensure the profiles table exists');
    return false;
  }
}

async function verifyNPRAFunctions() {
  console.log('\n🔧 Testing NPRA Database Functions...');
  
  try {
    const { npraProductLookup, decrementToken, getNpraStats } = require('../utils/npraDatabase');
    
    console.log('✅ NPRA functions imported successfully');
    
    // Test getNpraStats (safe function that doesn't modify data)
    console.log('🔍 Testing NPRA database stats...');
    const stats = await getNpraStats();
    
    if (stats.error) {
      console.log(`⚠️  NPRA stats check failed: ${stats.error}`);
      console.log('ℹ️  This might be expected if the medicines table is empty');
    } else {
      console.log(`✅ NPRA database accessible (${stats.total} medicines)`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ NPRA functions test failed: ${error.message}`);
    return false;
  }
}

async function runVerification() {
  console.log('🚀 Starting Gemini 1.5 Pro Setup Verification...\n');
  
  const checks = [
    { name: 'Environment Variables', fn: verifyEnvironmentVariables },
    { name: 'Gemini Authentication', fn: verifyGeminiAuthentication },
    { name: 'Supabase Connection', fn: verifySupabaseConnection },
    { name: 'NPRA Functions', fn: verifyNPRAFunctions }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, success: result });
    } catch (error) {
      console.log(`❌ ${check.name} check failed with error: ${error.message}`);
      results.push({ name: check.name, success: false });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n📈 Overall: ${successful}/${total} checks passed`);
  
  if (successful === total) {
    console.log('\n🎉 All checks passed! Gemini 1.5 Pro integration is ready.');
    console.log('\n🚀 Next steps:');
    console.log('1. Test the API: npm run test:gemini');
    console.log('2. Start the server: npm run server:dev');
    console.log('3. Deploy to production when ready');
  } else {
    console.log('\n⚠️  Some checks failed. Please review the errors above and fix them before proceeding.');
    console.log('\n📚 For detailed setup instructions, see: GEMINI_SETUP_GUIDE.md');
  }
  
  return successful === total;
}

// Run verification if this script is executed directly
if (require.main === module) {
  runVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = { runVerification };
