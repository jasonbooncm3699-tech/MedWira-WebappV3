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
    maxOutputTokens: 4096,
  }
});

// Tool call schema for medicine database lookup
const TOOL_CALL_SCHEMA = {
  "tool_call": {
    "name": "medicine_database_lookup",
    "parameters": {
      "product_name": "string",
      "active_ingredient": "string | null",
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
    // COMPREHENSIVE OUTPUT SCHEMA - Based on the Beatafe sample format
    const finalOutputSchema = {
        "status": "SUCCESS",
        "data": {
            "packaging_detected": "[String: Describe the packaging type, brand visibility, and active ingredients visible on packaging]",
            "medicine_name": "[String: Brand name with active ingredients and strengths in format: 'BrandName (ActiveIngredient1 strength / ActiveIngredient2 strength)']",
            "generic_name": "[String: Generic name of the medicine]",
            "purpose": "[String: What the medication treats, how it works, and medical indication]",
            "dosage_instructions": "[String: Detailed dosage for adults/children over 12, children 7-12 years, and general advice]",
            "side_effects": "[String: Common side effects, rare side effects, and overdose risks with specific symptoms]",
            "allergy_warning": "[String: Contains ingredients and excipients, allergy information]",
            "drug_interactions": "[String: Interactions with other drugs, food, and alcohol with specific warnings]",
            "safety_notes": "[String: Special warnings for children, pregnant women, and other medical conditions]",
            "storage": "[String: Storage instructions and safety precautions]",
            "disclaimer": "This information is sourced from medical databases and packaging details. For informational purposes only. Not medical advice. Consult a doctor or pharmacist before use."
        }
    };

    const basePrompt = `
You are a specialized medicine specialist AI assistant. Your primary task is to extract comprehensive data from medicine packaging images and provide detailed medical analysis.

**YOUR ROLE:** Medicine Specialist with expertise in pharmaceutical identification and analysis.

**CRITICAL EXTRACTION RULES:**
1. **COMPREHENSIVE EXTRACTION:** Extract ALL visible text and information from the medicine packaging
2. **ACCURATE READING:** Read exactly what is written, do not interpret or modify text
3. **COMPLETE DATA:** Look for product names, active ingredients, strengths, manufacturer, registration numbers, dosage forms, etc.
4. **NO HALLUCINATION:** Only extract what you can clearly see in the image
5. **DETAILED ANALYSIS:** Provide thorough information for accurate database matching

**WHAT TO EXTRACT FROM THE IMAGE:**
- **Product/Brand Name:** Main medicine name as written on packaging
- **Active Ingredients:** All active ingredients listed with their exact names
- **Strengths/Dosages:** All dosage strengths and concentrations
- **Manufacturer:** Company name if visible
- **Registration Number:** Any regulatory numbers (MAL, NOT, etc.)
- **Dosage Form:** Tablets, capsules, syrup, etc.
- **Packaging Details:** Blister pack, bottle, box, etc.
- **Any Other Text:** Additional information visible on packaging

**EXTRACTION APPROACH:**
- Read the image systematically from top to bottom, left to right
- Extract every piece of text that could be relevant for medicine identification
- Be thorough and comprehensive in your data extraction
- Focus on accuracy and completeness
`;
    
    if (isFirstCall) {
        // --- FIRST CALL PROMPT (Comprehensive data extraction for database matching) ---
        return `${basePrompt}
**TASK: COMPREHENSIVE MEDICINE DATA EXTRACTION**

As a medicine specialist, analyze this medicine packaging image and extract ALL possible data for accurate database matching.

**EXTRACTION PROCESS:**
1. **Systematic Analysis:** Read the entire packaging systematically
2. **Complete Data Collection:** Extract every relevant piece of information
3. **Accurate Transcription:** Copy text exactly as written, no interpretation
4. **Database Preparation:** Prepare data for precise database matching

**REQUIRED EXTRACTION FIELDS:**
- product_name: Main medicine/brand name (exact text from packaging)
- active_ingredient: All active ingredients (exact names as written)
- strength: All dosage strengths and concentrations (exact values)

**RETURN FORMAT:**
Provide the extracted data in this JSON structure:

\`\`\`json
${JSON.stringify(toolSchema, null, 2)}
\`\`\`

**EXTRACTION GUIDELINES:**
- Be thorough and comprehensive in your analysis
- Extract ALL visible text that could help identify the medicine
- Use exact text from packaging, no modifications
- If multiple active ingredients, include all of them
- If multiple strengths, include all values
- Focus on accuracy for successful database matching
`;
    } else {
        // --- SECOND CALL PROMPT (Generate comprehensive medical report) ---
        const dbStatus = databaseResult && databaseResult.id ? "PRODUCT FOUND & VERIFIED in our medicine database" : "PRODUCT NOT FOUND in our database - will use packaging analysis and medical knowledge";
        
        // Extract database information for enhancement
        const dbInfo = databaseResult && databaseResult.id ? {
            productName: databaseResult.product || databaseResult.npra_product || 'N/A',
            regNumber: databaseResult.reg_no || 'N/A',
            activeIngredients: databaseResult.active_ingredient || 'N/A',
            genericName: databaseResult.generic_name || 'N/A',
            manufacturer: databaseResult.manufacturer || 'N/A',
            holder: databaseResult.holder || 'N/A',
            status: databaseResult.status || 'N/A'
        } : null;
        
        return `You are a specialized medicine specialist AI assistant. Your task is to analyze the active ingredients of the identified medicine and provide comprehensive medical information.

**DATABASE MATCHING RESULT:** ${dbStatus}

${dbInfo ? `
**VERIFIED DATABASE INFORMATION:**
- Product Name: ${dbInfo.productName}
- Registration Number: ${dbInfo.regNumber}
- Active Ingredients: ${dbInfo.activeIngredients}
- Generic Name: ${dbInfo.genericName}
- Manufacturer: ${dbInfo.manufacturer}
- Holder: ${dbInfo.holder}
- Status: ${dbInfo.status}
` : ''}

**YOUR TASK: ACTIVE INGREDIENT ANALYSIS**

As a medicine specialist, analyze the active ingredients and provide detailed medical information based on:
1. **Official Database Information** (when available)
2. **Pharmacological Knowledge** of active ingredients
3. **Medical Best Practices** for each ingredient
4. **Safety Guidelines** and contraindications

**REQUIRED OUTPUT FORMAT:**
Generate the medical report in this EXACT JSON structure:

\`\`\`json
${JSON.stringify(finalOutputSchema, null, 2)}
\`\`\`

**ANALYSIS REQUIREMENTS FOR EACH FIELD:**

**packaging_detected:** Describe the packaging type, visible brand name, active ingredients, and strengths. Note any special packaging features or usage indicators.

**medicine_name:** Format as "BrandName (ActiveIngredient1 strength / ActiveIngredient2 strength)" using the exact database information when available.

**generic_name:** Use the official generic name from the database or standard pharmaceutical nomenclature.

**purpose:** Analyze each active ingredient's pharmacological action and therapeutic indication. Explain how the combination works synergistically if multiple ingredients.

**dosage_instructions:** Provide evidence-based dosage recommendations for different age groups, considering the active ingredients' pharmacokinetics and safety profiles.

**side_effects:** Analyze side effects based on each active ingredient's known adverse effects, including common, rare, and serious reactions.

**allergy_warning:** List all active ingredients and potential allergens, including cross-reactivity warnings and hypersensitivity reactions.

**drug_interactions:** Analyze potential interactions based on each active ingredient's metabolic pathways, receptor binding, and known drug interactions.

**safety_notes:** Provide comprehensive safety information considering each active ingredient's contraindications, special populations, and clinical considerations.

**storage:** Provide appropriate storage conditions based on the active ingredients' stability requirements and formulation characteristics.

**MEDICINE SPECIALIST ANALYSIS APPROACH:**
1. **Ingredient-by-Ingredient Analysis:** Analyze each active ingredient individually
2. **Combination Effects:** Consider synergistic or antagonistic effects of multiple ingredients
3. **Evidence-Based Information:** Use established pharmacological and clinical data
4. **Safety-First Approach:** Prioritize patient safety in all recommendations
5. **Comprehensive Coverage:** Address all aspects of safe and effective medication use

**CRITICAL INSTRUCTIONS:**
1. Base analysis on verified database information when available
2. Use established medical and pharmacological knowledge
3. Provide comprehensive, accurate, and clinically relevant information
4. Focus on patient safety and proper medication use
5. Return ONLY the JSON structure with complete analysis

IMPORTANT: Return ONLY the JSON structure. Do not provide any additional text or explanations.
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
    console.log(`🚀 [GEMINI] ========== STARTING GEMINI 1.5 PRO PIPELINE ==========`);
    console.log(`👤 [GEMINI] User ID: ${userId}`);
    console.log(`📝 [GEMINI] User Query: "${textQuery}"`);
    console.log(`🖼️ [GEMINI] Image provided: ${base64Image ? 'Yes' : 'No'}`);
    console.log(`📏 [GEMINI] Image data length: ${base64Image ? base64Image.length : 0} characters`);
    console.log(`⏰ [GEMINI] Pipeline started at: ${new Date().toISOString()}`);

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
        console.log(`🔍 [GEMINI] ========== STEP 1: IMAGE ANALYSIS & TOOL SIGNAL ==========`);
        console.log(`⏰ [GEMINI] Step 1 started at: ${new Date().toISOString()}`);
        
        const firstPrompt = buildGeminiSystemPrompt(true, null, TOOL_CALL_SCHEMA);
        console.log(`📝 [GEMINI] First prompt length: ${firstPrompt.length} characters`);
        console.log(`📝 [GEMINI] First prompt preview: ${firstPrompt.substring(0, 200)}...`);
        console.log(`🔧 [GEMINI] Tool schema:`, JSON.stringify(TOOL_CALL_SCHEMA, null, 2));
        
        // Prepare content for Gemini 1.5 Pro
        let firstContent = firstPrompt;
        
        if (base64Image) {
            // Ensure image has proper data URL format for Gemini
            const imageData = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
            const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            console.log(`🖼️ [GEMINI] Image data format: ${imageData.substring(0, 50)}...`);
            console.log(`🖼️ [GEMINI] Base64 data length: ${base64Data.length} characters`);
            console.log(`🖼️ [GEMINI] MIME type: image/jpeg`);
            
            firstContent = [firstPrompt, {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            }];
        }
        
        firstContent += `\n\nUser Query: ${textQuery}`;
        console.log(`📤 [GEMINI] Sending to Gemini:`, {
            hasImage: !!base64Image,
            textQuery: textQuery,
            contentType: Array.isArray(firstContent) ? 'multimodal' : 'text',
            contentLength: Array.isArray(firstContent) ? 'multimodal' : firstContent.length
        });

        let firstResponse;
        const firstCallStartTime = Date.now();
        try {
            console.log(`⏰ [GEMINI] First Gemini call started at: ${new Date().toISOString()}`);
            const response = await model.generateContent(firstContent);
            const firstCallDuration = Date.now() - firstCallStartTime;
            firstResponse = response.response.text();
            console.log(`✅ [GEMINI] First Gemini call successful`);
            console.log(`⏱️ [GEMINI] First call duration: ${firstCallDuration}ms`);
            console.log(`📥 [GEMINI] Raw first response length: ${firstResponse.length} characters`);
            console.log(`📥 [GEMINI] Raw first response preview: ${firstResponse.substring(0, 300)}...`);
            console.log(`📥 [GEMINI] Full first response:`, firstResponse);
        } catch(e) {
            const firstCallDuration = Date.now() - firstCallStartTime;
            console.error(`❌ [GEMINI] First call failed after ${firstCallDuration}ms:`, e);
            console.error(`❌ [GEMINI] First call error details:`, {
                message: e.message,
                stack: e.stack,
                name: e.name
            });
            return { status: "ERROR", message: "Error during initial image analysis and tool signal." };
        }

        // 3. CHECK FOR TOOL SIGNAL & EXECUTE TOOL
        console.log(`🔍 [GEMINI] ========== STEP 2: TOOL SIGNAL PARSING & DATABASE LOOKUP ==========`);
        console.log(`⏰ [GEMINI] Step 2 started at: ${new Date().toISOString()}`);
        console.log(`🔍 [GEMINI] Searching for JSON in first response...`);
        
        const jsonMatch = firstResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        let databaseResult = null;
        
        if (jsonMatch) {
            console.log(`✅ [GEMINI] JSON pattern found in response`);
            console.log(`🔍 [GEMINI] JSON match length: ${jsonMatch[1].length} characters`);
            console.log(`🔍 [GEMINI] JSON match preview: ${jsonMatch[1].substring(0, 200)}...`);
            try {
                const jsonSignal = JSON.parse(jsonMatch[1]);
                console.log(`🔧 [GEMINI] Tool Signal Parsed Successfully:`, JSON.stringify(jsonSignal, null, 2));
                
                if (jsonSignal.tool_call && jsonSignal.tool_call.parameters) {
                    const { product_name, active_ingredient, strength } = jsonSignal.tool_call.parameters;
                    
                    console.log(`🔍 [GEMINI] Extracted Parameters:`, {
                        product_name,
                        active_ingredient,
                        strength
                    });
                    
                    console.log(`🔍 [GEMINI] Executing medicine database lookup for: "${product_name}"`);
                    const dbLookupStartTime = Date.now();
                    // EXECUTE DATABASE LOOKUP
                    databaseResult = await npraProductLookup(product_name, null);
                    const dbLookupDuration = Date.now() - dbLookupStartTime;
                    console.log(`⏱️ [GEMINI] Database lookup duration: ${dbLookupDuration}ms`);
                    console.log(`📊 [GEMINI] Database lookup result:`, databaseResult);
                    
                    if (databaseResult && databaseResult.product) {
                        console.log(`✅ [GEMINI] Medicine database lookup successful: "${databaseResult.product}"`);
                        console.log(`📋 [GEMINI] Found product details:`, {
                            id: databaseResult.id,
                            reg_no: databaseResult.reg_no,
                            product: databaseResult.product,
                            status: databaseResult.status,
                            holder: databaseResult.holder,
                            active_ingredient: databaseResult.active_ingredient,
                            generic_name: databaseResult.generic_name
                        });
                    } else {
                        console.log(`⚠️ [GEMINI] Product "${product_name}" not found in database, searching by active ingredients...`);
                        // Try searching by individual active ingredients if product not found
                        if (active_ingredient && active_ingredient.includes('and')) {
                            const ingredients = active_ingredient.split('and').map(ing => ing.trim());
                            console.log(`🔍 [GEMINI] Searching for individual ingredients: ${ingredients.join(', ')}`);
                            
                            for (const ingredient of ingredients) {
                                console.log(`🔍 [GEMINI] Searching for ingredient: "${ingredient}"`);
                                const ingredientResult = await npraProductLookup(ingredient, null);
                                if (ingredientResult) {
                                    console.log(`✅ [GEMINI] Found equivalent product by ingredient: "${ingredientResult.product}"`);
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
                            console.log(`❌ [GEMINI] No medicine found in database for any search criteria`);
                            databaseResult = { status: "NOT_FOUND", message: "No medicine found in our database. Will use packaging analysis and web research." };
                        }
                    }
                } else {
                    console.log(`⚠️ [GEMINI] Tool signal found but no valid parameters`);
                    console.log(`🔍 [GEMINI] Tool signal structure:`, JSON.stringify(jsonSignal, null, 2));
                    databaseResult = { status: "INVALID_SIGNAL", message: "Tool signal found but parameters are invalid." };
                }
            } catch (e) {
                console.error(`❌ [GEMINI] Tool Execution/Parsing Error:`, e);
                console.error(`❌ [GEMINI] Failed to parse JSON:`, jsonMatch[1]);
                console.error(`❌ [GEMINI] JSON parsing error details:`, {
                    message: e.message,
                    stack: e.stack,
                    name: e.name
                });
                databaseResult = { status: "TOOL_ERROR", message: "Error executing internal database lookup tool or parsing LLM signal." }; 
            }
        } else {
            // Fallback: If no structured signal, treat the first response as general text
            console.log(`⚠️ [GEMINI] No tool signal detected - Gemini provided direct answer`);
            console.log(`📝 [GEMINI] First response (no JSON found):`, firstResponse);
            databaseResult = { status: "NO_SIGNAL", message: "LLM provided a direct answer. Bypassing database lookup.", raw_llm_text: firstResponse };
        }
        
        // Check if the LLM provided a direct, complete answer without a tool signal
        if (databaseResult.status === "NO_SIGNAL") {
            console.log(`✅ [GEMINI] Returning direct Gemini response`);
            console.log(`📝 [GEMINI] Direct response content:`, databaseResult.raw_llm_text);
            // Deduct token only after successful AI processing
            await decrementToken(userId);
            return { status: "SUCCESS", data: { text: databaseResult.raw_llm_text, note: databaseResult.message } };
        }

        // 4. SECOND LLM CALL: AUGMENTATION & FINAL OUTPUT
        console.log(`🔍 [GEMINI] ========== STEP 3: FINAL REPORT GENERATION ==========`);
        console.log(`⏰ [GEMINI] Step 3 started at: ${new Date().toISOString()}`);
        console.log(`📊 [GEMINI] Database result for final prompt:`, JSON.stringify(databaseResult, null, 2));
        
        const finalPrompt = buildGeminiSystemPrompt(false, databaseResult, null); 
        console.log(`📝 [GEMINI] Final prompt length: ${finalPrompt.length} characters`);
        console.log(`📝 [GEMINI] Final prompt preview: ${finalPrompt.substring(0, 300)}...`);
        
        // Prepare content for final call - no image needed for second call
        let finalContent = finalPrompt + `\n\nUser Query: ${textQuery}`;
        console.log(`📤 [GEMINI] Sending final request to Gemini with database data`);
        console.log(`📤 [GEMINI] Final content length: ${finalContent.length} characters`);

        const finalCallStartTime = Date.now();
        try {
            console.log(`⏰ [GEMINI] Final Gemini call started at: ${new Date().toISOString()}`);
            const finalResponse = await model.generateContent(finalContent);
            const finalCallDuration = Date.now() - finalCallStartTime;
            const finalText = finalResponse.response.text();
            console.log(`✅ [GEMINI] Final Gemini call successful`);
            console.log(`⏱️ [GEMINI] Final call duration: ${finalCallDuration}ms`);
            console.log(`📥 [GEMINI] Raw final response length: ${finalText.length} characters`);
            console.log(`📥 [GEMINI] Raw final response preview: ${finalText.substring(0, 500)}...`);
            console.log(`📥 [GEMINI] Full final response:`, finalText);
            
            // Attempt to extract the final structured JSON output - handle both wrapped and unwrapped JSON
            console.log(`🔍 [GEMINI] Attempting to extract JSON from final response...`);
            let finalJsonMatch = finalText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            
            // If no wrapped JSON found, try to find JSON directly
            if (!finalJsonMatch) {
                console.log(`🔍 [GEMINI] No wrapped JSON found, searching for direct JSON...`);
                finalJsonMatch = finalText.match(/(\{[\s\S]*\})/);
            }
            
            if (finalJsonMatch) {
                console.log(`✅ [GEMINI] JSON pattern found in final response`);
                console.log(`🔍 [GEMINI] JSON match length: ${finalJsonMatch[1].length} characters`);
                console.log(`🔍 [GEMINI] JSON match preview: ${finalJsonMatch[1].substring(0, 300)}...`);
                try {
                    const jsonString = finalJsonMatch[1];
                    console.log(`🔍 [GEMINI] Extracted JSON string length: ${jsonString.length} characters`);
                    console.log(`🔍 [GEMINI] Extracted JSON string preview: ${jsonString.substring(0, 500)}...`);
                    const structuredResult = JSON.parse(jsonString);
                    console.log(`✅ [GEMINI] Structured JSON response parsed successfully:`, JSON.stringify(structuredResult, null, 2));
                    
                    // Check if medicine name was extracted properly
                    if (structuredResult.data && structuredResult.data.medicine_name) {
                        console.log(`✅ [GEMINI] Medicine name extracted: "${structuredResult.data.medicine_name}"`);
                        console.log(`📋 [GEMINI] All extracted fields:`, Object.keys(structuredResult.data || {}));
                    } else {
                        console.log(`❌ [GEMINI] No medicine name found in structured result`);
                        console.log(`🔍 [GEMINI] Available data fields:`, Object.keys(structuredResult.data || {}));
                    }
                    
                    // Deduct token only after successful AI processing
                    await decrementToken(userId);
                    console.log(`✅ [GEMINI] ========== PIPELINE COMPLETED SUCCESSFULLY ==========`);
                    console.log(`⏰ [GEMINI] Pipeline completed at: ${new Date().toISOString()}`);
                    return {
                        status: "SUCCESS",
                        data: {
                            ...structuredResult,
                            database_result: databaseResult,
                            source: "gemini_structured"
                        }
                    };
                } catch (e) {
                    console.error(`❌ [GEMINI] Final JSON parse error, returning raw text.`, e);
                    console.error(`❌ [GEMINI] Failed to parse JSON:`, finalJsonMatch[1]);
                    console.error(`❌ [GEMINI] JSON parsing error details:`, {
                        message: e.message,
                        stack: e.stack,
                        name: e.name
                    });
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
            console.log(`⚠️ [GEMINI] No structured JSON detected in final response`);
            console.log(`📝 [GEMINI] Final response (no JSON found):`, finalText);
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
            const finalCallDuration = Date.now() - finalCallStartTime;
            console.error(`❌ [GEMINI] Final call failed after ${finalCallDuration}ms:`, e);
            console.error(`❌ [GEMINI] Final call error details:`, {
                message: e.message,
                stack: e.stack,
                name: e.name
            });
            return { status: "ERROR", message: "Error synthesizing final medical information." };
        }

    } catch (error) {
        console.error(`❌ [GEMINI] ========== PIPELINE FAILED ==========`);
        console.error(`❌ [GEMINI] Pipeline error:`, error);
        console.error(`❌ [GEMINI] Pipeline error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        console.error(`⏰ [GEMINI] Pipeline failed at: ${new Date().toISOString()}`);
        return { 
            status: "SERVICE_ERROR", 
            message: "Gemini AI service failed. Please try again." 
        };
    }
}

module.exports = { runGeminiPipeline };
