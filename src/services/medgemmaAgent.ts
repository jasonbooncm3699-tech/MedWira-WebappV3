/**
 * MedGemma 4B Agent Controller (TypeScript)
 * 
 * Handles the multi-step LLM pipeline for medicine analysis using MedGemma 4B.
 * Implements the three-step process: Image Analysis → NPRA Lookup → Final Augmentation
 */

import { VertexAI } from '@google-cloud/vertexai';
import { npraProductLookup, enhancedNpraLookup, decrementToken } from '../utils/npraDatabase';

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

// Type definitions
export interface MedGemmaResult {
  status: 'SUCCESS' | 'ERROR';
  data?: {
    text?: string;
    npra_result?: any;
    source?: string;
    note?: string;
    [key: string]: any;
  };
  message?: string;
}

export interface TokenCheckResult {
  success: boolean;
  remainingTokens?: number;
  message: string;
}

export interface NPRAProduct {
  id: string;
  reg_no: string;
  npra_product: string;
  description?: string;
  status: string;
  holder?: string;
  text?: string;
}

/**
 * Executes the three-step MedGemma Multimodal pipeline.
 * 
 * @param base64Image - Base64 encoded image data
 * @param textQuery - User's text query about the medicine
 * @param userId - User ID for token management
 * @returns Analysis result with status and data
 */
export async function runMedGemmaPipeline(
  base64Image: string, 
  textQuery: string, 
  userId: string
): Promise<MedGemmaResult> {
  console.log(`🚀 Starting MedGemma Pipeline for user: ${userId}`);
  console.log(`📝 Query: "${textQuery}"`);
  console.log(`🖼️ Image provided: ${base64Image ? 'Yes' : 'No'}`);

  try {
    // 1. TOKEN DEDUCTION (NOW IMPLEMENTED)
    if (!userId) {
      // Should not happen if authenticated, but a safety check
      console.log(`❌ User ID missing for token check`);
      return { status: "ERROR", message: "User ID missing for token check." };
    }
    
    // Implement the token check before any costly LLM calls
    console.log(`🔍 Checking and deducting token for user: ${userId}`);
    if (!await decrementToken(userId)) { 
      console.log(`❌ Token deduction failed for user: ${userId}`);
      return { status: "ERROR", message: "Out of tokens. Please renew your subscription or earn more tokens." }; 
    }
    console.log(`✅ Token successfully deducted for user: ${userId}`);

    // 2. FIRST LLM CALL: IMAGE ANALYSIS & TOOL SIGNAL
    console.log(`🔍 Step 1: MedGemma Image Analysis & Tool Signal`);
    
    const firstPrompt = buildMedGemmaSystemPrompt(true, null, TOOL_CALL_SCHEMA);
    const contentParts: any[] = [ { text: firstPrompt } ];
    
    if (base64Image) {
      contentParts.push({ 
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      });
    }
    contentParts.push({ text: `User Query: ${textQuery}` });

    let firstResponse: string;
    try {
      const response = await vertexAI.generateContent({
        model: model,
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          maxOutputTokens: 512, 
          temperature: 0.1,
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
    
    let npraResult: any = null;
    if (jsonMatch) {
      try {
        const jsonSignal = JSON.parse(jsonMatch[1]);
        console.log(`🔧 Tool Signal Parsed:`, jsonSignal);
        
        if (jsonSignal.tool_call && jsonSignal.tool_call.parameters) {
          const { product_name, registration_number, active_ingredient } = jsonSignal.tool_call.parameters;
          
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
    const finalContentParts: any[] = [ { text: finalPrompt } ];
    
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
          maxOutputTokens: 2048,
          temperature: 0.3,
        }
      });
      
      const finalText = finalResponse.response.candidates[0].content.parts[0].text;
      console.log(`✅ Final MedGemma call successful`);
      
      // Attempt to extract the final structured JSON output
      const finalJsonMatch = finalText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      
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
 * @param userId - User ID
 * @returns Token check result
 */
export async function checkAndDeductToken(userId: string): Promise<TokenCheckResult> {
  try {
    console.log(`🔍 Checking tokens for user: ${userId}`);
    
    // Use the real token management function
    const tokenDeducted = await decrementToken(userId);
    
    if (tokenDeducted) {
      return {
        success: true,
        message: "Token deducted successfully"
      };
    } else {
      return {
        success: false,
        message: "No tokens remaining or token deduction failed"
      };
    }
  } catch (error) {
    console.error('❌ Token management error:', error);
    return {
      success: false,
      message: "Token management system error"
    };
  }
}

/**
 * Generates the specific system prompt required for MedGemma based on the pipeline step.
 * Enforces structured JSON output for both tool signaling and the final medical report.
 * @param isFirstCall - True for the initial image analysis/tool signal call.
 * @param npraResult - The result object from the internal 'public.medicines' database lookup.
 * @param toolSchema - The expected JSON schema for the tool call (only used in the first call).
 * @returns The structured system prompt.
 */
export function buildMedGemmaSystemPrompt(
  isFirstCall: boolean, 
  npraResult: any, 
  toolSchema: any
): string {
    // REFINED FINAL OUTPUT SCHEMA (Removed npra_registration_no)
    const finalOutputSchema = {
        "status": "SUCCESS",
        "data": {
            "packaging_detected": "[String: Describe key text/features/dosage from the image and database data.]",
            "medicine_name": "[String: Official Product Name (from DB) + Active Ingredients (MedGemma knowledge)]",
            "purpose": "[String: Uses/indications. MedGemma knowledge augmented by product name.]",
            "dosage_instructions": "[String: General adult/child dosage. MedGemma knowledge.]",
            "side_effects": "[String: Common and serious side effects. MedGemma knowledge.]",
            "allergy_warning": "[String: Key ingredient allergy warning. MedGemma knowledge.]",
            "drug_interactions": "[String: Major known interactions. MedGemma knowledge.]",
            "safety_notes": "[String: Warnings for pregnancy, driving, pre-existing conditions (e.g., high blood pressure). MedGemma knowledge.]",
            "storage": "[String: General storage conditions (room temp, direct sunlight). MedGemma knowledge.]",
            "disclaimer": "Disclaimer: This information is sourced from our internal medicine database and medical knowledge. It is for informational purposes only and is NOT medical advice. Consult a licensed doctor or pharmacist before use."
        }
    };

    const basePrompt = `
You are the **MedWira Product Specialist**, an expert in Malaysian medicine information powered by MedGemma 4B Monolith. Your primary directive is to provide comprehensive, accurate, and safety-focused details about medicines.

**CORE DIRECTIVES - FOLLOW STRICTLY:**
1. **Multimodality:** Analyze the provided image (if present) for visual text (OCR) like the product name, dosage, or registration number.
2. **Database Verification:** You MUST incorporate the data from the internal \`public.medicines\` database lookup call to verify the product's official name and status.
3. **Augmentation:** You MUST combine the official database details with your internal, extensive medical knowledge to complete the structured report (Purpose, Dosage, Side Effects, etc.).
`;
    
    if (isFirstCall) {
        // --- FIRST CALL PROMPT (Analyze image and signal tool use) ---
        return `${basePrompt}
**CURRENT TASK: TOOL SIGNALING**
Analyze the image and user query. Extract the exact **Product Name** and **Registration Number** (MAL/NOT) if visible. Your ENTIRE output must be a single JSON object wrapped in \`\`\`json tags, adhering strictly to the TOOL DEFINITION schema below. Do not include any other text, greetings, or reasoning.

**TOOL DEFINITION:**
\`\`\`json
${JSON.stringify(toolSchema, null, 2)}
\`\`\`
`;
    } else {
        // --- SECOND CALL PROMPT (Augment with Database results and generate final report) ---
        const dbStatus = npraResult && npraResult.id ? "PRODUCT FOUND & VERIFIED in internal database" : "PRODUCT NOT FOUND in internal database or failed lookup";
        
        return `${basePrompt}
**CURRENT TASK: FINAL REPORT GENERATION**
The internal database lookup is complete.

- **Database Status:** ${dbStatus}
- **Database Data:** \`\`\`json
${JSON.stringify(npraResult || {id: null, message: "No result or search failed. Rely on general knowledge and image." }, null, 2)}
\`\`\`

You must now use this database data (if available) and your general medical knowledge to generate a comprehensive, structured report that adheres **exactly** to the FINAL OUTPUT FORMAT below.

**FINAL OUTPUT FORMAT:**
Your ENTIRE response must be a single JSON object wrapped in \`\`\`json tags. Fill all nested fields accurately. If specific data is missing, fill the field with the most accurate information based on the visual input and your knowledge.

\`\`\`json
${JSON.stringify(finalOutputSchema, null, 2)}
\`\`\`

Start your response with the final \`\`\`json structure now.
`;
    }
}
