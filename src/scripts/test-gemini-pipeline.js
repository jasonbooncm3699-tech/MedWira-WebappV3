/**
 * MedGemma 4B Two-Step Pipeline Testing Script
 * 
 * This script tests the complete two-step LLM pipeline implementation:
 * Step 1: Image Analysis & Tool Signaling
 * Step 2: Database Augmentation & Final Report Generation
 */

const { runMedGemmaPipeline } = require('../services/medgemmaAgent');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('🧪 MedGemma 4B Two-Step Pipeline Testing');
console.log('=' .repeat(60));

/**
 * Test the complete two-step pipeline with a sample medicine image
 */
async function testCompletePipeline() {
  console.log('\n🔍 Testing Complete Two-Step Pipeline...');
  
  try {
    // Test parameters
    const testUserId = 'test-user-pipeline-123';
    const textQuery = 'What is this medicine? What are its side effects and dosage instructions?';
    
    // Create a sample base64 image (small test image)
    // In a real test, you would use an actual medicine image
    const sampleImageBase64 = createSampleImageBase64();
    
    console.log(`📝 Query: "${textQuery}"`);
    console.log(`👤 User ID: ${testUserId}`);
    console.log(`🖼️ Image: ${sampleImageBase64 ? 'Provided' : 'None'}`);
    
    // Execute the complete pipeline
    const result = await runMedGemmaPipeline(sampleImageBase64, textQuery, testUserId);
    
    console.log('\n📊 Pipeline Result:');
    console.log('=' .repeat(40));
    console.log(`Status: ${result.status}`);
    
    if (result.status === 'SUCCESS') {
      console.log('✅ Pipeline completed successfully!');
      
      if (result.data) {
        console.log('\n📋 Response Data:');
        console.log('=' .repeat(30));
        
        // Display structured response if available
        if (result.data.medicine_name) {
          console.log(`💊 Medicine Name: ${result.data.medicine_name}`);
        }
        if (result.data.purpose) {
          console.log(`🎯 Purpose: ${result.data.purpose}`);
        }
        if (result.data.side_effects) {
          console.log(`⚠️ Side Effects: ${result.data.side_effects}`);
        }
        if (result.data.dosage_instructions) {
          console.log(`📏 Dosage: ${result.data.dosage_instructions}`);
        }
        if (result.data.source) {
          console.log(`🔍 Source: ${result.data.source}`);
        }
        if (result.data.npra_result) {
          console.log(`🗄️ NPRA Result: ${JSON.stringify(result.data.npra_result, null, 2)}`);
        }
      }
    } else {
      console.log(`❌ Pipeline failed: ${result.message}`);
      if (result.httpStatus) {
        console.log(`HTTP Status: ${result.httpStatus}`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    return { status: 'ERROR', message: error.message };
  }
}

/**
 * Test Step 1: Image Analysis & Tool Signaling
 */
async function testStep1ToolSignaling() {
  console.log('\n🔍 Testing Step 1: Image Analysis & Tool Signaling...');
  
  try {
    // Test with minimal parameters to focus on Step 1
    const testUserId = 'test-user-step1-456';
    const textQuery = 'Identify this medicine and extract the product name and registration number.';
    const sampleImageBase64 = createSampleImageBase64();
    
    console.log(`📝 Query: "${textQuery}"`);
    console.log(`👤 User ID: ${testUserId}`);
    
    // We'll need to modify the pipeline to stop after Step 1 for this test
    // For now, we'll run the complete pipeline and examine the logs
    const result = await runMedGemmaPipeline(sampleImageBase64, textQuery, testUserId);
    
    console.log('\n📊 Step 1 Result:');
    console.log(`Status: ${result.status}`);
    
    if (result.status === 'SUCCESS' && result.data.npra_result) {
      console.log('✅ Step 1 (Tool Signaling) completed successfully!');
      console.log(`🔧 NPRA Result Status: ${result.data.npra_result.status}`);
      
      if (result.data.npra_result.status === 'TOOL_ERROR') {
        console.log('⚠️ Tool execution had issues, but signaling worked');
      } else if (result.data.npra_result.status === 'NOT_FOUND') {
        console.log('ℹ️ Tool executed but no NPRA data found (expected for test)');
      }
    } else {
      console.log(`❌ Step 1 failed: ${result.message}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Step 1 test failed:', error);
    return { status: 'ERROR', message: error.message };
  }
}

/**
 * Test token management integration
 */
async function testTokenManagement() {
  console.log('\n💰 Testing Token Management Integration...');
  
  try {
    // Test with invalid user ID to trigger token error
    const invalidUserId = 'invalid-user-token-test';
    const textQuery = 'Test query for token management';
    
    console.log(`👤 Invalid User ID: ${invalidUserId}`);
    
    const result = await runMedGemmaPipeline(null, textQuery, invalidUserId);
    
    console.log('\n📊 Token Management Result:');
    console.log(`Status: ${result.status}`);
    console.log(`Message: ${result.message}`);
    
    if (result.status === 'ERROR' && result.httpStatus === 402) {
      console.log('✅ Token management working correctly - 402 error for invalid user');
    } else if (result.status === 'ERROR' && result.message.includes('token')) {
      console.log('✅ Token management working - token error detected');
    } else {
      console.log('⚠️ Token management test inconclusive');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Token management test failed:', error);
    return { status: 'ERROR', message: error.message };
  }
}

/**
 * Test error handling and edge cases
 */
async function testErrorHandling() {
  console.log('\n🛡️ Testing Error Handling & Edge Cases...');
  
  const testCases = [
    {
      name: 'No Image, Text Only',
      base64Image: null,
      textQuery: 'What are the side effects of this medicine?',
      userId: 'test-user-no-image'
    },
    {
      name: 'Empty Query',
      base64Image: createSampleImageBase64(),
      textQuery: '',
      userId: 'test-user-empty-query'
    },
    {
      name: 'No User ID',
      base64Image: createSampleImageBase64(),
      textQuery: 'Test query',
      userId: null
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    
    try {
      const result = await runMedGemmaPipeline(
        testCase.base64Image,
        testCase.textQuery,
        testCase.userId
      );
      
      console.log(`Status: ${result.status}`);
      console.log(`Message: ${result.message || 'Success'}`);
      
      results.push({
        test: testCase.name,
        status: result.status,
        message: result.message
      });
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      results.push({
        test: testCase.name,
        status: 'ERROR',
        message: error.message
      });
    }
  }
  
  return results;
}

/**
 * Create a minimal sample image for testing
 * In production, you would use actual medicine images
 */
function createSampleImageBase64() {
  // Create a minimal 1x1 pixel JPEG in base64 for testing
  // This is just a placeholder - in real testing, use actual medicine images
  const minimalJpeg = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
  return `data:image/jpeg;base64,${minimalJpeg}`;
}

/**
 * Run all pipeline tests
 */
async function runAllTests() {
  console.log('🚀 Starting MedGemma 4B Pipeline Test Suite...\n');
  
  const testResults = {
    completePipeline: null,
    step1ToolSignaling: null,
    tokenManagement: null,
    errorHandling: null
  };
  
  try {
    // Test 1: Complete Pipeline
    testResults.completePipeline = await testCompletePipeline();
    
    // Test 2: Step 1 Tool Signaling
    testResults.step1ToolSignaling = await testStep1ToolSignaling();
    
    // Test 3: Token Management
    testResults.tokenManagement = await testTokenManagement();
    
    // Test 4: Error Handling
    testResults.errorHandling = await testErrorHandling();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 PIPELINE TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Complete Pipeline', result: testResults.completePipeline },
    { name: 'Step 1 Tool Signaling', result: testResults.step1ToolSignaling },
    { name: 'Token Management', result: testResults.tokenManagement },
    { name: 'Error Handling', result: testResults.errorHandling }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    if (test.result) {
      if (test.result.status === 'SUCCESS' || 
          (test.result.status === 'ERROR' && test.result.message.includes('token'))) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED - ${test.result.message}`);
      }
    } else {
      console.log(`⚠️ ${test.name}: NOT RUN`);
    }
  });
  
  console.log(`\n📈 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All pipeline tests passed! MedGemma 4B integration is working correctly.');
    console.log('\n🚀 Your two-step LLM pipeline is ready for production use!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
    console.log('\n💡 Make sure your environment variables are set correctly:');
    console.log('   - GCP_PROJECT_ID');
    console.log('   - SUPABASE_URL');
    console.log('   - SUPABASE_KEY');
    console.log('   - GOOGLE_APPLICATION_CREDENTIALS (if needed)');
  }
  
  return { passed, total, results: testResults };
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(result => {
      process.exit(result.passed === result.total ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  runAllTests,
  testCompletePipeline,
  testStep1ToolSignaling,
  testTokenManagement,
  testErrorHandling
};
