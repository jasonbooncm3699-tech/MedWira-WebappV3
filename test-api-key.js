#!/usr/bin/env node

// Simple script to test OpenAI API key configuration
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.OPENAI_API_KEY;

console.log('🔍 OpenAI API Key Configuration Test');
console.log('=====================================');

if (!apiKey) {
  console.log('❌ ERROR: OPENAI_API_KEY not found in environment');
  console.log('');
  console.log('🔧 SOLUTION:');
  console.log('1. Edit .env.local file:');
  console.log('   nano .env.local');
  console.log('2. Replace "your_openai_api_key_here" with your actual API key');
  console.log('3. Get your API key from: https://platform.openai.com/api-keys');
  console.log('4. Restart your development server');
  process.exit(1);
}

if (apiKey === 'your_openai_api_key_here') {
  console.log('❌ ERROR: API key not configured (still using placeholder)');
  console.log('');
  console.log('🔧 SOLUTION:');
  console.log('1. Edit .env.local file:');
  console.log('   nano .env.local');
  console.log('2. Replace "your_openai_api_key_here" with your actual API key');
  console.log('3. Get your API key from: https://platform.openai.com/api-keys');
  process.exit(1);
}

if (!apiKey.startsWith('sk-proj-')) {
  console.log('⚠️  WARNING: API key format might be incorrect');
  console.log('Expected format: sk-proj-...');
  console.log('Your format:', apiKey.substring(0, 10) + '...');
  console.log('');
}

console.log('✅ SUCCESS: OpenAI API key is configured!');
console.log('Key format:', apiKey.substring(0, 10) + '...');
console.log('');
console.log('🚀 You can now start your development server:');
console.log('   npm run dev');
console.log('');
console.log('📱 Test the image analysis feature by uploading a medicine image!');
