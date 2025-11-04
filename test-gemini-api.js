/**
 * Test script to verify Gemini API is working
 * This script tests the API connection and quota status
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Try to load environment variables from .env.local
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // If dotenv not available, try .env
  try {
    require('dotenv').config();
  } catch (e2) {
    // If no dotenv, environment variables should be set in shell
    console.log('ℹ️  dotenv not found, using environment variables from shell');
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Connection...\n');

  // Check if API key exists
  if (!API_KEY) {
    console.error('❌ ERROR: NEXT_PUBLIC_GEMINI_API_KEY not found in environment variables');
    console.log('💡 Make sure you have .env.local file with NEXT_PUBLIC_GEMINI_API_KEY set');
    process.exit(1);
  }

  console.log('✅ API Key found:', API_KEY.substring(0, 10) + '...' + API_KEY.substring(API_KEY.length - 4));
  console.log('');

  try {
    // Initialize Gemini
    console.log('📡 Initializing Gemini 2.5 Pro model...');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100, // Small response for testing
      },
    });

    console.log('✅ Model initialized successfully');
    console.log('');

    // Test with a simple prompt
    console.log('📤 Sending test request to Gemini API...');
    const testPrompt = 'Say "Hello, Gemini API is working!" in one sentence.';
    
    const startTime = Date.now();
    const result = await model.generateContent(testPrompt);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const response = result.response.text();
    
    console.log('✅ API Response received successfully!');
    console.log('');
    console.log('📊 Test Results:');
    console.log('   Response Time:', responseTime + 'ms');
    console.log('   Model:', 'gemini-2.5-pro');
    console.log('   Response:', response.trim());
    console.log('');
    console.log('🎉 SUCCESS: Gemini API is working correctly!');
    console.log('');
    console.log('✅ Your API key is valid');
    console.log('✅ Quota is available');
    console.log('✅ API is responding normally');
    
    return true;

  } catch (error) {
    console.error('❌ ERROR: Gemini API test failed');
    console.error('');
    
    // Check for specific error types
    if (error.status === 429) {
      console.error('🚫 QUOTA EXCEEDED');
      console.error('   Error:', error.message);
      console.error('');
      console.error('💡 Solutions:');
      console.error('   1. Check your Google Cloud Console for quota limits');
      console.error('   2. Wait for quota reset (usually daily/monthly)');
      console.error('   3. Request quota increase if needed');
      console.error('   4. Check billing status');
    } else if (error.status === 401 || error.status === 403) {
      console.error('🚫 AUTHENTICATION ERROR');
      console.error('   Error:', error.message);
      console.error('');
      console.error('💡 Solutions:');
      console.error('   1. Verify your API key is correct');
      console.error('   2. Check API key permissions');
      console.error('   3. Ensure API is enabled in Google Cloud Console');
    } else {
      console.error('   Error Type:', error.constructor.name);
      console.error('   Error Message:', error.message);
      console.error('   Status Code:', error.status || 'N/A');
      console.error('');
      console.error('💡 Check:');
      console.error('   1. API key is valid');
      console.error('   2. Internet connection');
      console.error('   3. Google API service status');
    }
    
    console.error('');
    console.error('Full error details:', error);
    
    return false;
  }
}

// Run the test
testGeminiAPI()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

