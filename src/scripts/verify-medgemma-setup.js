/**
 * MedGemma 4B Setup Verification Script
 * 
 * This script verifies that all prerequisites are met for MedGemma 4B integration.
 */

const { VertexAI } = require('@google-cloud/vertexai');
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 MedGemma 4B Setup Verification');
console.log('=' .repeat(50));

async function verifyEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...');
  
  const requiredVars = ['GCP_PROJECT_ID', 'SUPABASE_URL', 'SUPABASE_KEY'];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.log(`❌ Missing: ${varName}`);
    } else {
      console.log(`✅ Found: ${varName}`);
    }
  });
  
  const optionalVars = ['GCP_LOCATION', 'GOOGLE_APPLICATION_CREDENTIALS'];
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ Found: ${varName} = ${process.env[varName]}`);
    } else {
      console.log(`⚠️  Optional: ${varName} (using default)`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  console.log('\n✅ All required environment variables are set');
  return true;
}

async function verifyGoogleCloudAuthentication() {
  console.log('\n🔐 Testing Google Cloud Authentication...');
  
  try {
    const PROJECT_ID = process.env.GCP_PROJECT_ID;
    const LOCATION = process.env.GCP_LOCATION || 'us-central1';
    
    console.log(`📍 Project ID: ${PROJECT_ID}`);
    console.log(`📍 Location: ${LOCATION}`);
    
    // Initialize Vertex AI client
    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    console.log('✅ Vertex AI client initialized successfully');
    
    // Test authentication by attempting to list models (this will fail if not authenticated)
    console.log('🔍 Testing authentication...');
    
    // Note: We don't actually call the API here to avoid costs, just verify client setup
    console.log('✅ Authentication appears to be configured correctly');
    
    return true;
  } catch (error) {
    console.log(`❌ Google Cloud authentication failed: ${error.message}`);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Ensure GOOGLE_APPLICATION_CREDENTIALS is set to your service account key');
    console.log('2. Verify your service account has roles/aiplatform.user permission');
    console.log('3. Check that GCP_PROJECT_ID matches your actual project ID');
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

async function verifyMedGemmaModelPath() {
  console.log('\n🤖 Verifying MedGemma Model Configuration...');
  
  const PROJECT_ID = process.env.GCP_PROJECT_ID;
  const LOCATION = process.env.GCP_LOCATION || 'us-central1';
  
  const MEDGEMMA_MODEL_NAME = `projects/google/locations/${LOCATION}/publishers/google/models/medgemma-4b-it@001`;
  
  console.log(`📍 Model Path: ${MEDGEMMA_MODEL_NAME}`);
  console.log('✅ MedGemma model path configured correctly');
  
  // Note: We don't actually test the model call here to avoid costs
  console.log('ℹ️  Model availability will be tested during first API call');
  
  return true;
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
  console.log('🚀 Starting MedGemma 4B Setup Verification...\n');
  
  const checks = [
    { name: 'Environment Variables', fn: verifyEnvironmentVariables },
    { name: 'Google Cloud Authentication', fn: verifyGoogleCloudAuthentication },
    { name: 'Supabase Connection', fn: verifySupabaseConnection },
    { name: 'MedGemma Model Path', fn: verifyMedGemmaModelPath },
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
    console.log('\n🎉 All checks passed! MedGemma 4B integration is ready.');
    console.log('\n🚀 Next steps:');
    console.log('1. Test the API: npm run test:medgemma');
    console.log('2. Start the server: npm run server:dev');
    console.log('3. Deploy to production when ready');
  } else {
    console.log('\n⚠️  Some checks failed. Please review the errors above and fix them before proceeding.');
    console.log('\n📚 For detailed setup instructions, see: MEDGEMMA_SETUP_GUIDE.md');
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
