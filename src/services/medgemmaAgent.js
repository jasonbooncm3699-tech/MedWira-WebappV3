/**
 * MedGemma 4B Agent Controller
 * 
 * Handles the multi-step LLM pipeline for medicine analysis using MedGemma 4B.
 * Implements the three-step process: Image Analysis → NPRA Lookup → Final Augmentation
 */

const { VertexAI } = require('@google-cloud/vertexai');
const { npraProductLookup, enhancedNpraLookup } = require('../utils/npraDatabase');

// Environment variables for Google Cloud and MedGemma
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const MEDGEMMA_ENDPOINT_ID = process.env.MEDGEMMA_ENDPOINT_ID; // Your deployed endpoint ID

// Initialize Vertex AI client
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// MedGemma 4B model path
const model = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/medgemma-4b-it@001`; 

// Tool call schema for NPRA lookup
const TOOL_CALL_SCHEMA = {
  "tool_call": {
    "name": "npra_product_lookup",
    "parameters": {
      "product_name": "string",
      "registration_number": "string | null",
      "active_ingredient": "string | null"
    }
  }
};

/**
 * Executes the three-step MedGemma Multimodal pipeline.
 * 
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} textQuery - User's text query about the medicine
 * @param {string} userId - User ID for token management
 * @returns {Promise<Object>} Analysis result with status and data
 */
async function runMedGemmaPipeline(base64Image, textQuery, userId) {
  console.log(`🚀 Starting MedGemma Pipeline for user: ${userId}`);
  console.log(`📝 Query: "${textQuery}"`);
  console.log(`🖼️ Image provided: ${base64Image ? 'Yes' : 'No'}`);

  try {
    // 1. TOKEN DEDUCTION (PLACEHOLDER: Implement your actual Supabase token check/update here)
    // NOTE: This logic needs to be fully implemented. Your DB has a 'token_count' column.
    // Example: if (!await decrementToken(userId)) { return { status: "ERROR", message: "Out of tokens." }; }
    
    const tokenCheck = await checkAndDeductToken(userId);
    if (!tokenCheck.success) {
      console.log(`❌ Token check failed: ${tokenCheck.message}`);
      return { status: "ERROR", message: tokenCheck.message };
    }
    console.log(`✅ Token deducted. Remaining: ${tokenCheck.remainingTokens}`);

    // 2. FIRST LLM CALL: IMAGE ANALYSIS & TOOL SIGNAL
    console.log(`🔍 Step 1: MedGemma Image Analysis & Tool Signal`);
    
    const firstPrompt = buildMedGemmaSystemPrompt(true, null, TOOL_CALL_SCHEMA);
    const contentParts = [ { text: firstPrompt } ];
    
    if (base64Image) {
      contentParts.push({ 
        inlineData: {
          mimeType: 'image/jpeg', // Adjust mimeType if needed
          data: base64Image.replace(/^data:image\/[a-z]+;base64,/, '') // Remove data URL prefix
        }
      });
    }
    contentParts.push({ text: `User Query: ${textQuery}` });

    let firstResponse;
    try {
      const response = await vertexAI.generateContent({
        model: model,
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          // Ensure sufficient maxOutputTokens for the JSON signal
          maxOutputTokens: 512, 
          temperature: 0.1, // Keep low for deterministic parsing
        }
      });
      firstResponse = response.response.candidates[0].content.parts[0].text;
      console.log(`✅ First MedGemma call successful`);
    } catch(e) {
      console.error('❌ MedGemma First Call Error:', e);
      return { status: "ERROR", message: "Error during initial image analysis and tool signal." };
    }

    // 3. CHECK FOR TOOL SIGNAL & EXECUTE TOOL
    console.log(`🔍 Step 2: Parsing Tool Signal & Executing NPRA Lookup`);
    
    const jsonMatch = firstResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    
    let npraResult = null;
    if (jsonMatch) {
      try {
        const jsonSignal = JSON.parse(jsonMatch[1]);
        console.log(`🔧 Tool Signal Parsed:`, jsonSignal);
        
        if (jsonSignal.tool_call && jsonSignal.tool_call.parameters) {
          const { product_name, registration_number, active_ingredient } = jsonSignal.tool_call.parameters;
          
          // EXECUTE NPRA TOOL (Supabase Call)
          console.log(`🔍 Executing NPRA lookup...`);
          npraResult = await enhancedNpraLookup(product_name, registration_number, active_ingredient);
          
          if (npraResult) {
            console.log(`✅ NPRA Lookup successful: ${npraResult.npra_product}`);
          } else {
            console.log(`⚠️ NPRA Lookup returned no results`);
            npraResult = { status: "NOT_FOUND", message: "No NPRA data found for the identified medicine." };
          }
        }
      } catch (e) {
        console.error('❌ Tool Execution/Parsing Error:', e);
        npraResult = { status: "TOOL_ERROR", message: "Error executing NPRA lookup tool or parsing LLM signal." }; 
      }
    } else {
      // Handle case where MedGemma just provided a direct answer without using the tool
      console.log(`⚠️ No tool signal detected - MedGemma provided direct answer`);
      npraResult = { status: "NO_SIGNAL", message: "LLM provided a direct answer. Bypassing tool lookup." };
    }
    
    // Fallback if the first response was a direct answer and no tool call was made
    if (npraResult && npraResult.status === "NO_SIGNAL") {
      console.log(`✅ Returning direct MedGemma response`);
      return { 
        status: "SUCCESS", 
        data: { 
          text: firstResponse, 
          note: npraResult.message,
          source: "medgemma_direct"
        } 
      };
    }
    
    // 4. SECOND LLM CALL: AUGMENTATION & FINAL OUTPUT
    console.log(`🔍 Step 3: Final MedGemma Augmentation with NPRA Data`);
    
    const finalPrompt = buildMedGemmaSystemPrompt(false, npraResult, null); 
    const finalContentParts = [ { text: finalPrompt } ];
    
    // We send the image again in case the model needs to reference it for the description
    if (base64Image) {
      finalContentParts.push({ 
        inlineData: { 
          mimeType: 'image/jpeg', 
          data: base64Image.replace(/^data:image\/[a-z]+;base64,/, '') 
        }
      });
    }
    finalContentParts.push({ text: `User Query: ${textQuery}` });

    try {
      const finalResponse = await vertexAI.generateContent({
        model: model,
        contents: [{ role: 'user', parts: finalContentParts }],
        config: {
          maxOutputTokens: 2048, // Higher for detailed output
          temperature: 0.3, // Slightly higher for augmentation creativity
        }
      });
      
      const finalText = finalResponse.response.candidates[0].content.parts[0].text;
      console.log(`✅ Final MedGemma call successful`);
      
      // Attempt to extract the final structured JSON output
      const finalJsonMatch = finalText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      
      // If the model provides a complete JSON structure, return it
      if (finalJsonMatch) {
        try {
          const structuredResult = JSON.parse(finalJsonMatch[1]);
          console.log(`✅ Structured JSON response parsed`);
          return {
            status: "SUCCESS",
            data: {
              ...structuredResult,
              npra_result: npraResult,
              source: "medgemma_structured"
            }
          };
        } catch (e) {
          console.error("❌ Final JSON parse error, returning raw text.");
          return { 
            status: "SUCCESS", 
            data: { 
              text: finalText, 
              npra_result: npraResult,
              source: "medgemma_raw"
            } 
          };
        }
      } 
      
      // Otherwise, return the raw text with a success status
      return { 
        status: "SUCCESS", 
        data: { 
          text: finalText, 
          npra_result: npraResult,
          source: "medgemma_raw"
        } 
      };

    } catch (e) {
      console.error('❌ MedGemma Final Call Error:', e);
      return { status: "ERROR", message: "Error synthesizing final medical information." };
    }

  } catch (error) {
    console.error('❌ MedGemma Pipeline Error:', error);
    return { 
      status: "ERROR", 
      message: "Unexpected error in MedGemma pipeline execution." 
    };
  }
}

/**
 * Check user token balance and deduct one token if available
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Token check result
 */
async function checkAndDeductToken(userId) {
  // TODO: Implement actual Supabase token management
  // This is a placeholder implementation
  
  try {
    console.log(`🔍 Checking tokens for user: ${userId}`);
    
    // Placeholder: Always return success for now
    // In production, this should:
    // 1. Query Supabase profiles table for token_count
    // 2. Check if token_count > 0
    // 3. Decrement token_count by 1
    // 4. Update the record
    
    return {
      success: true,
      remainingTokens: 29, // Placeholder
      message: "Token deducted successfully"
    };
  } catch (error) {
    console.error('❌ Token management error:', error);
    return {
      success: false,
      message: "Token management system error"
    };
  }
}

/**
 * Helper function for system prompt creation
 * This will be fully implemented in Phase 3 with proper medical prompts
 * 
 * @param {boolean} isFirstCall - Whether this is the first or second LLM call
 * @param {Object|null} toolResult - Result from NPRA lookup tool
 * @param {Object|null} toolSchema - Tool call schema for first call
 * @returns {string} Formatted system prompt
 */
function buildMedGemmaSystemPrompt(isFirstCall, toolResult, toolSchema) {
  if (isFirstCall) {
    return `You are MedGemma 4B, a specialized medical AI assistant for medicine identification and analysis.

**TASK**: Analyze the provided medicine image and user query to extract key information.

**INSTRUCTIONS**:
1. Examine the medicine image carefully
2. Extract: medicine name, registration number, active ingredients, manufacturer
3. If you need official NPRA (Malaysia) data, respond with this JSON format:

${JSON.stringify(toolSchema, null, 2)}

**IMPORTANT**: Only use the tool call if you need official NPRA verification. If you can provide a complete analysis from the image alone, do so directly.

**OUTPUT**: Provide detailed medicine information including purpose, dosage, side effects, and safety warnings.`;
  } else {
    return `You are MedGemma 4B, now with access to official NPRA database information.

**TASK**: Synthesize the image analysis with official NPRA data to provide comprehensive medicine information.

**NPRA DATA PROVIDED**:
${JSON.stringify(toolResult, null, 2)}

**INSTRUCTIONS**:
1. Combine image analysis with official NPRA data
2. Provide comprehensive medicine information
3. Include safety warnings and contraindications
4. Format response clearly with sections for different information types

**OUTPUT FORMAT**: Provide detailed analysis including:
- Medicine identification (brand + generic names)
- Purpose and indications
- Dosage instructions
- Side effects and warnings
- Drug interactions
- Storage instructions
- Safety notes and contraindications

**IMPORTANT**: Always include appropriate medical disclaimers.`;
  }
}

module.exports = { 
  runMedGemmaPipeline, 
  checkAndDeductToken,
  buildMedGemmaSystemPrompt 
};
