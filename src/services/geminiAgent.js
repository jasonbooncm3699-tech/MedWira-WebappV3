/**
 * Gemini 1.5 Pro Agent Service - Two-Step Pipeline Implementation
 * 
 * Complete implementation of the Gemini 1.5 Pro pipeline with NPRA database integration,
 * token management, and structured output generation.
 * 
 * Maintains the same two-step architecture as MedGemma for consistency:
 * Step 1: Image Analysis & Tool Signaling
 * Step 2: Database Augmentation & Final Report Generation
 */

// Import required modules
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { npraProductLookup, checkTokenAvailability, decrementToken } = require('../utils/npraDatabase'); 

// Initialize Gemini 1.5 Pro client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 2048,
  }
});

// Tool call schema for medicine database lookup
const TOOL_CALL_SCHEMA = {
  "tool_call": {
    "name": "medicine_database_lookup",
    "parameters": {
      "product_name": "string",
      "registration_number": "string | null",
      "active_ingredient": "string | null",
      "manufacturer": "string | null",
      "strength": "string | null"
    }
  }
};

/**
 * Generates the specific system prompt required for Gemini 1.5 Pro based on the pipeline step.
 * Implements the user's required final output schema.
 * @param {boolean} isFirstCall - True for the initial image analysis/tool signal call.
 * @param {Object|null} npraResult - The result object from the internal 'public.medicines' database lookup.
 * @param {Object|null} toolSchema - The expected JSON schema for the tool call (only used in the first call).
 * @returns {string} The structured system prompt.
 */
function buildGeminiSystemPrompt(isFirstCall, databaseResult, toolSchema) {
    // FINAL OUTPUT SCHEMA - Based on the sample image format
    const finalOutputSchema = {
        "status": "SUCCESS",
        "data": {
            "packaging_detected": "[String: Describe the packaging type and visible information from the image]",
            "medicine_name": "[String: Brand name and active ingredients with strengths]",
            "purpose": "[String: What the medication treats and how it works]",
            "dosage_instructions": "[String: Dosage for different age groups]",
            "side_effects": "[String: Common, rare side effects and overdose risks]",
            "allergy_warning": "[String: Contains ingredients and allergy information]",
            "drug_interactions": "[String: Interactions with drugs, food, and alcohol]",
            "safety_notes": "[String: Special warnings for kids, pregnant women, and other conditions]",
            "storage": "[String: Storage instructions]",
            "disclaimer": "Disclaimer: This information is sourced from our internal medicine database and reliable medical sources. It is for informational purposes only and is NOT medical advice. Consult a licensed doctor or pharmacist before use."
        }
    };

    const basePrompt = `
You are the **MedWira Product Specialist**, an expert in Malaysian medicine information powered by Gemini 1.5 Pro. Your primary directive is to provide comprehensive, accurate, and safety-focused details about medicines.

**CORE DIRECTIVES - FOLLOW STRICTLY:**
1. **Packaging Analysis:** Extract ALL visible data from medicine packaging including product name, active ingredients, strengths, manufacturer, registration number, and any other text visible on the packaging.
2. **Database Search:** You MUST search our internal \`public.medicines\` database (the most complete Malaysian medicine database) to find matching records.
3. **Web Research:** If additional medical information is needed, use reliable medical sources (FDA, WHO, pharmaceutical databases, medical journals) to supplement database information.
4. **Comprehensive Response:** Always start with "Packaging detected:" and provide detailed analysis in the exact format specified.
`;
    
    if (isFirstCall) {
        // --- FIRST CALL PROMPT (Analyze packaging and signal tool use) ---
        return `${basePrompt}
**CURRENT TASK: PACKAGING ANALYSIS & DATABASE SEARCH SIGNAL**
Carefully analyze the medicine packaging image and extract ALL visible information. Look for:
- Product/Brand name
- Active ingredients and their strengths
- Registration number (MAL/NOT)
- Manufacturer name
- Any other text visible on packaging

Your ENTIRE output must be a single JSON object wrapped in \`\`\`json tags, adhering strictly to the TOOL DEFINITION schema below. Do not include any other text, greetings, or reasoning.

**TOOL DEFINITION:**
\`\`\`json
${JSON.stringify(toolSchema, null, 2)}
\`\`\`
`;
    } else {
        // --- SECOND CALL PROMPT (Generate comprehensive medical report) ---
        const dbStatus = databaseResult && databaseResult.id ? "PRODUCT FOUND & VERIFIED in our medicine database" : "PRODUCT NOT FOUND in our database - will use web research";
        
        return `${basePrompt}
**CURRENT TASK: COMPREHENSIVE MEDICAL REPORT GENERATION**
The medicine database lookup is complete.

- **Database Status:** ${dbStatus}
- **Database Data:** \`\`\`json
${JSON.stringify(databaseResult || {id: null, message: "No database match found. Will rely on packaging analysis and web research." }, null, 2)}
\`\`\`

You must now generate a comprehensive medical report that follows the EXACT format from the sample. Always start with "Packaging detected:" and provide detailed information in the specified sections.

**REQUIRED FORMAT:**
Your ENTIRE response must be a single JSON object wrapped in \`\`\`json tags. Fill all nested fields with detailed, accurate information.

\`\`\`json
${JSON.stringify(finalOutputSchema, null, 2)}
\`\`\`

**IMPORTANT:** 
- Start with "Packaging detected:" in the packaging_detected field
- Use database information when available
- Supplement with reliable web sources for missing information
- Provide specific, actionable information in each section
- Include proper dosage instructions for different age groups
- List comprehensive side effects and safety warnings

Start your response with the final \`\`\`json structure now.
`;
    }
}

/**
 * Executes the two-step Gemini 1.5 Pro Multimodal pipeline: Token Check -> Signal -> Tool Call -> Augmentation.
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} textQuery - User's text query about the medicine
 * @param {string} userId - User ID for token management
 * @returns {Promise<Object>} Analysis result with status and data
 */
async function runGeminiPipeline(base64Image, textQuery, userId) {
    console.log(`🚀 Starting Gemini 1.5 Pro Pipeline for user: ${userId}`);
    console.log(`📝 Query: "${textQuery}"`);
    console.log(`🖼️ Image provided: ${base64Image ? 'Yes' : 'No'}`);

    try {
        // Define the cost of one analysis
        const REQUIRED_COST = 1;
        
        // 1. CRITICAL: Check token availability
        if (!userId) {
            console.log(`❌ User ID missing for token check`);
            return { status: "ERROR", message: "User ID missing for token check." };
        }
        
        console.log(`🔍 GeminiAgent: Starting token check for user: ${userId} (required: ${REQUIRED_COST} tokens)`);
        
        const isTokenAvailable = await checkTokenAvailability(userId, REQUIRED_COST);
        console.log(`🔍 GeminiAgent: Token check result: ${isTokenAvailable}`);
        
        if (!isTokenAvailable) {
            console.log(`❌ User ${userId} has insufficient tokens (Required: ${REQUIRED_COST})`);
            return { 
                status: "INSUFFICIENT_TOKENS", 
                message: "Insufficient token. Please subscribe or redeem a referral code." 
            };
        }
        
        console.log(`✅ GeminiAgent: Token check PASSED for user: ${userId}`);

        // 2. FIRST LLM CALL: IMAGE ANALYSIS & TOOL SIGNAL
        console.log(`🔍 Step 1: Gemini 1.5 Pro Image Analysis & Tool Signal`);
        
        const firstPrompt = buildGeminiSystemPrompt(true, null, TOOL_CALL_SCHEMA);
        
        // Prepare content for Gemini 1.5 Pro
        let firstContent = firstPrompt;
        
        if (base64Image) {
            // Ensure image has proper data URL format for Gemini
            const imageData = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
            firstContent = [firstPrompt, {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData.replace(/^data:image\/[a-z]+;base64,/, '')
                }
            }];
        }
        
        firstContent += `\n\nUser Query: ${textQuery}`;

        let firstResponse;
        try {
            const response = await model.generateContent(firstContent);
            firstResponse = response.response.text();
            console.log(`✅ First Gemini call successful`);
        } catch(e) {
            console.error('❌ Gemini First Call Error:', e);
            return { status: "ERROR", message: "Error during initial image analysis and tool signal." };
        }

        // 3. CHECK FOR TOOL SIGNAL & EXECUTE TOOL
        console.log(`🔍 Step 2: Parsing Tool Signal & Executing Medicine Database Lookup`);
        
        const jsonMatch = firstResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        let databaseResult = null;
        
        if (jsonMatch) {
            try {
                const jsonSignal = JSON.parse(jsonMatch[1]);
                console.log(`🔧 Tool Signal Parsed:`, jsonSignal);
                
                if (jsonSignal.tool_call && jsonSignal.tool_call.parameters) {
                    const { product_name, registration_number, active_ingredient, manufacturer, strength } = jsonSignal.tool_call.parameters;
                    
                    console.log(`🔍 Executing medicine database lookup for: ${product_name}`);
                    // EXECUTE DATABASE LOOKUP
                    databaseResult = await npraProductLookup(product_name, registration_number);
                    
                    if (databaseResult) {
                        console.log(`✅ Medicine database lookup successful: ${databaseResult.product}`);
                    } else {
                        console.log(`⚠️ Product not found, searching by active ingredients...`);
                        // Try searching by individual active ingredients if product not found
                        if (active_ingredient && active_ingredient.includes('and')) {
                            const ingredients = active_ingredient.split('and').map(ing => ing.trim());
                            console.log(`🔍 Searching for individual ingredients: ${ingredients.join(', ')}`);
                            
                            for (const ingredient of ingredients) {
                                const ingredientResult = await npraProductLookup(ingredient, null);
                                if (ingredientResult) {
                                    console.log(`✅ Found equivalent product by ingredient: ${ingredientResult.product}`);
                                    databaseResult = {
                                        ...ingredientResult,
                                        search_method: 'active_ingredient',
                                        searched_ingredient: ingredient,
                                        original_product: product_name
                                    };
                                    break;
                                }
                            }
                        }
                        
                        if (!databaseResult) {
                            databaseResult = { status: "NOT_FOUND", message: "No medicine found in our database. Will use packaging analysis and web research." };
                        }
                    }
                }
            } catch (e) {
                console.error('❌ Tool Execution/Parsing Error:', e);
                databaseResult = { status: "TOOL_ERROR", message: "Error executing internal database lookup tool or parsing LLM signal." }; 
            }
        } else {
            // Fallback: If no structured signal, treat the first response as general text
            console.log(`⚠️ No tool signal detected - Gemini provided direct answer`);
            databaseResult = { status: "NO_SIGNAL", message: "LLM provided a direct answer. Bypassing database lookup.", raw_llm_text: firstResponse };
        }
        
        // Check if the LLM provided a direct, complete answer without a tool signal
        if (databaseResult.status === "NO_SIGNAL") {
            console.log(`✅ Returning direct Gemini response`);
            // Deduct token only after successful AI processing
            await decrementToken(userId);
            return { status: "SUCCESS", data: { text: databaseResult.raw_llm_text, note: databaseResult.message } };
        }

        // 4. SECOND LLM CALL: AUGMENTATION & FINAL OUTPUT
        console.log(`🔍 Step 3: Final Gemini Augmentation with Medicine Database Data`);
        
        const finalPrompt = buildGeminiSystemPrompt(false, databaseResult, null); 
        
        // Prepare content for final call
        let finalContent = finalPrompt;
        
        if (base64Image) {
            // Include image again for context
            const imageData = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
            finalContent = [finalPrompt, {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData.replace(/^data:image\/[a-z]+;base64,/, '')
                }
            }];
        }
        
        finalContent += `\n\nUser Query: ${textQuery}`;

        try {
            const finalResponse = await model.generateContent(finalContent);
            const finalText = finalResponse.response.text();
            console.log(`✅ Final Gemini call successful`);
            
            // Attempt to extract the final structured JSON output
            const finalJsonMatch = finalText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            
            if (finalJsonMatch) {
                       try {
                           const structuredResult = JSON.parse(finalJsonMatch[1]);
                           console.log(`✅ Structured JSON response parsed`);
                           // Deduct token only after successful AI processing
                           await decrementToken(userId);
                           return {
                               status: "SUCCESS",
                               data: {
                                   ...structuredResult,
                                   database_result: databaseResult,
                                   source: "gemini_structured"
                               }
                           };
                       } catch (e) {
                           console.error("❌ Final JSON parse error, returning raw text.", e);
                           // Deduct token only after successful AI processing
                           await decrementToken(userId);
                           return { 
                               status: "SUCCESS", 
                               data: { 
                                   text: finalText, 
                                   database_result: databaseResult, 
                                   note: "JSON parsing failed after second call, returning raw text." 
                               } 
                           };
                       }
            } 
            
            // If final JSON structure is not detected
            console.log(`⚠️ No structured JSON detected in final response`);
            // Deduct token only after successful AI processing
            await decrementToken(userId);
            return { 
                status: "SUCCESS", 
                data: { 
                    text: finalText, 
                    database_result: databaseResult, 
                    note: "LLM did not return structured JSON for final output." 
                } 
            };

        } catch (e) {
            console.error('❌ Gemini Final Call Error:', e);
            return { status: "ERROR", message: "Error synthesizing final medical information." };
        }

    } catch (error) {
        console.error('❌ Gemini Pipeline Error:', error);
        return { 
            status: "SERVICE_ERROR", 
            message: "Gemini AI service failed. Please try again." 
        };
    }
}

module.exports = { runGeminiPipeline };
