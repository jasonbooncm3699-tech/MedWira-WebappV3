/**
 * Gemini 1.5 Pro Agent Service - Two-Step Pipeline Implementation
 * 
 * Complete implementation of the Gemini 1.5 Pro pipeline with NPRA database integration,
 * token management, and structured output generation.
 * 
 * Maintains the same two-step architecture for consistency:
 * Step 1: Image Analysis & Tool Signaling
 * Step 2: Database Augmentation & Final Report Generation
 */

// Import required modules
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { npraProductLookup, checkTokenAvailability, decrementToken } = require('../utils/npraDatabase'); 

// Initialize Gemini 1.5 Pro client
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
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
            "generic_name": "[String: Generic name of the medicine]",
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
You are a text extraction tool. Your ONLY job is to read text from images.

**CRITICAL RULES:**
1. **READ TEXT ONLY:** Look at the image and read the text that is visible
2. **NO GUESSING:** If you cannot clearly see text, return null
3. **NO ASSUMPTIONS:** Do not guess medicine names or make assumptions
4. **EXACT COPY:** Copy exactly what you see, do not interpret
5. **IF UNCLEAR:** Return null rather than guessing

**WARNING:** Do not assume this is any specific medicine. Read only the actual text visible in the image.
`;
    
    if (isFirstCall) {
        // --- FIRST CALL PROMPT (Analyze packaging and signal tool use) ---
        return `${basePrompt}
**TASK: READ TEXT FROM IMAGE**

Look at the image and read the text. If you cannot clearly see text, return null.

Fields to look for (if clearly visible):
- product_name: The main product name text
- registration_number: Any registration/MAL number
- active_ingredient: Any ingredient text
- manufacturer: Any manufacturer text
- strength: Any dosage/strength text

Return JSON in this format:

\`\`\`json
${JSON.stringify(toolSchema, null, 2)}
\`\`\`

CRITICAL: If you cannot clearly see text, use null. Do not guess or assume medicine names.
`;
    } else {
        // --- SECOND CALL PROMPT (Generate comprehensive medical report) ---
        const dbStatus = databaseResult && databaseResult.id ? "PRODUCT FOUND & VERIFIED in our medicine database" : "PRODUCT NOT FOUND in our database - will use web research";
        
        return `Generate a medical report for the medicine identified.

Database result: ${dbStatus}

Create a JSON response with this structure:

\`\`\`json
${JSON.stringify(finalOutputSchema, null, 2)}
\`\`\`

Fill in the fields with information about the medicine. Use the database data when available.

IMPORTANT: You must respond with the JSON structure above. Do not provide any other text.
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
    console.log(`🚀 [GEMINI] Starting Gemini 1.5 Pro Pipeline for user: ${userId}`);
    console.log(`📝 [GEMINI] Query: "${textQuery}"`);
    console.log(`🖼️ [GEMINI] Image provided: ${base64Image ? 'Yes' : 'No'}`);

    try {
        // Define the cost of one analysis
        const REQUIRED_COST = 1;
        
        // 1. CRITICAL: Check token availability
        if (!userId || typeof userId !== 'string' || userId.length < 5) {
            console.error(`❌ [GEMINI] CRITICAL: Invalid user ID in pipeline:`, { userId, type: typeof userId, length: userId?.length });
            return { status: "ERROR", message: "Invalid user ID provided to pipeline." };
        }
        
        console.log(`🔍 [GEMINI] Starting token check for user: ${userId} (required: ${REQUIRED_COST} tokens)`);
        
        const tokenCheckResult = await checkTokenAvailability(userId, REQUIRED_COST);
        console.log(`🔍 [GEMINI] Token check result:`, tokenCheckResult);
        
        if (!tokenCheckResult.isAvailable) {
            // Separate the two failure reasons
            if (tokenCheckResult.reason === "INSUFFICIENT_TOKENS") {
                console.log(`❌ [GEMINI] User ${userId} blocked due to insufficient tokens (Required: ${REQUIRED_COST})`);
                return { 
                    status: "INSUFFICIENT_TOKENS", 
                    message: "Insufficient token. Please subscribe or redeem a referral code." 
                };
            }
            
            // Handle all other failure reasons (e.g., DATABASE_ERROR)
            console.log(`❌ [GEMINI] User ${userId} blocked due to service error: ${tokenCheckResult.reason}`);
            return { 
                status: "SERVICE_UNAVAILABLE", 
                message: "Authentication service is temporarily unavailable." 
            };
        }
        
        console.log(`✅ [GEMINI] Token check PASSED for user: ${userId}`);

        // 2. FIRST LLM CALL: IMAGE ANALYSIS & TOOL SIGNAL
        console.log(`🔍 Step 1: Gemini 1.5 Pro Image Analysis & Tool Signal`);
        
        const firstPrompt = buildGeminiSystemPrompt(true, null, TOOL_CALL_SCHEMA);
        console.log(`📝 First Prompt:`, firstPrompt);
        
        // Prepare content for Gemini 1.5 Pro
        let firstContent = firstPrompt;
        
        if (base64Image) {
            // Ensure image has proper data URL format for Gemini
            const imageData = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
            console.log(`🖼️ Image data format:`, imageData.substring(0, 50) + '...');
            firstContent = [firstPrompt, {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData.replace(/^data:image\/[a-z]+;base64,/, '')
                }
            }];
        }
        
        firstContent += `\n\nUser Query: ${textQuery}`;
        console.log(`📤 Sending to Gemini:`, {
            hasImage: !!base64Image,
            textQuery: textQuery,
            contentType: Array.isArray(firstContent) ? 'multimodal' : 'text'
        });

        let firstResponse;
        try {
            const response = await model.generateContent(firstContent);
            firstResponse = response.response.text();
            console.log(`✅ First Gemini call successful`);
            console.log(`📥 Raw First Response:`, firstResponse);
        } catch(e) {
            console.error('❌ Gemini First Call Error:', e);
            return { status: "ERROR", message: "Error during initial image analysis and tool signal." };
        }

        // 3. CHECK FOR TOOL SIGNAL & EXECUTE TOOL
        console.log(`🔍 Step 2: Parsing Tool Signal & Executing Medicine Database Lookup`);
        console.log(`🔍 Searching for JSON in first response...`);
        
        const jsonMatch = firstResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        let databaseResult = null;
        
        if (jsonMatch) {
            console.log(`✅ JSON pattern found in response`);
            try {
                const jsonSignal = JSON.parse(jsonMatch[1]);
                console.log(`🔧 Tool Signal Parsed Successfully:`, JSON.stringify(jsonSignal, null, 2));
                
                if (jsonSignal.tool_call && jsonSignal.tool_call.parameters) {
                    const { product_name, registration_number, active_ingredient, manufacturer, strength } = jsonSignal.tool_call.parameters;
                    
                    console.log(`🔍 Extracted Parameters:`, {
                        product_name,
                        registration_number,
                        active_ingredient,
                        manufacturer,
                        strength
                    });
                    
                    console.log(`🔍 Executing medicine database lookup for: "${product_name}"`);
                    // EXECUTE DATABASE LOOKUP
                    databaseResult = await npraProductLookup(product_name, registration_number);
                    console.log(`📊 Database lookup result:`, databaseResult);
                    
                    if (databaseResult && databaseResult.product) {
                        console.log(`✅ Medicine database lookup successful: "${databaseResult.product}"`);
                    } else {
                        console.log(`⚠️ Product "${product_name}" not found in database, searching by active ingredients...`);
                        // Try searching by individual active ingredients if product not found
                        if (active_ingredient && active_ingredient.includes('and')) {
                            const ingredients = active_ingredient.split('and').map(ing => ing.trim());
                            console.log(`🔍 Searching for individual ingredients: ${ingredients.join(', ')}`);
                            
                            for (const ingredient of ingredients) {
                                console.log(`🔍 Searching for ingredient: "${ingredient}"`);
                                const ingredientResult = await npraProductLookup(ingredient, null);
                                if (ingredientResult) {
                                    console.log(`✅ Found equivalent product by ingredient: "${ingredientResult.product}"`);
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
                        
                        if (!databaseResult || !databaseResult.product) {
                            console.log(`❌ No medicine found in database for any search criteria`);
                            databaseResult = { status: "NOT_FOUND", message: "No medicine found in our database. Will use packaging analysis and web research." };
                        }
                    }
                } else {
                    console.log(`⚠️ Tool signal found but no valid parameters`);
                    databaseResult = { status: "INVALID_SIGNAL", message: "Tool signal found but parameters are invalid." };
                }
            } catch (e) {
                console.error('❌ Tool Execution/Parsing Error:', e);
                console.error('❌ Failed to parse JSON:', jsonMatch[1]);
                databaseResult = { status: "TOOL_ERROR", message: "Error executing internal database lookup tool or parsing LLM signal." }; 
            }
        } else {
            // Fallback: If no structured signal, treat the first response as general text
            console.log(`⚠️ No tool signal detected - Gemini provided direct answer`);
            console.log(`📝 First response (no JSON found):`, firstResponse);
            databaseResult = { status: "NO_SIGNAL", message: "LLM provided a direct answer. Bypassing database lookup.", raw_llm_text: firstResponse };
        }
        
        // Check if the LLM provided a direct, complete answer without a tool signal
        if (databaseResult.status === "NO_SIGNAL") {
            console.log(`✅ Returning direct Gemini response`);
            console.log(`📝 Direct response content:`, databaseResult.raw_llm_text);
            // Deduct token only after successful AI processing
            await decrementToken(userId);
            return { status: "SUCCESS", data: { text: databaseResult.raw_llm_text, note: databaseResult.message } };
        }

        // 4. SECOND LLM CALL: AUGMENTATION & FINAL OUTPUT
        console.log(`🔍 Step 3: Final Gemini Augmentation with Medicine Database Data`);
        console.log(`📊 Database result for final prompt:`, JSON.stringify(databaseResult, null, 2));
        
        const finalPrompt = buildGeminiSystemPrompt(false, databaseResult, null); 
        console.log(`📝 Final Prompt:`, finalPrompt);
        
        // Prepare content for final call - no image needed for second call
        let finalContent = finalPrompt + `\n\nUser Query: ${textQuery}`;
        console.log(`📤 Sending final request to Gemini with database data`);

        try {
            const finalResponse = await model.generateContent(finalContent);
            const finalText = finalResponse.response.text();
            console.log(`✅ Final Gemini call successful`);
            console.log(`📥 Raw Final Response:`, finalText);
            
            // Attempt to extract the final structured JSON output
            const finalJsonMatch = finalText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            
            if (finalJsonMatch) {
                console.log(`✅ JSON pattern found in final response`);
                try {
                    const structuredResult = JSON.parse(finalJsonMatch[1]);
                    console.log(`✅ Structured JSON response parsed successfully:`, JSON.stringify(structuredResult, null, 2));
                    
                    // Check if medicine name was extracted properly
                    if (structuredResult.data && structuredResult.data.medicine_name) {
                        console.log(`✅ Medicine name extracted: "${structuredResult.data.medicine_name}"`);
                    } else {
                        console.log(`❌ No medicine name found in structured result`);
                    }
                    
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
                    console.error("❌ Failed to parse JSON:", finalJsonMatch[1]);
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
            console.log(`📝 Final response (no JSON found):`, finalText);
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
