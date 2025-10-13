/**
 * NPRA Database Utility (TypeScript)
 * 
 * Connects to Supabase to retrieve official, verified product data from the 'public.medicines' table.
 */

import { createClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client to avoid build-time errors
let supabaseClient: any = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Use service role key for server-side operations to bypass RLS policies
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase environment variables are not configured');
    }
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Debug: Verify we're using service role key
    console.log('🔍 [DEBUG] Supabase client created with key type:', 
      SUPABASE_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 
      SUPABASE_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ANON' : 'OTHER'
    );
  }
  return supabaseClient;
}

// REMOVED: getUserScanHistory function - replaced with unified chat history

// Type definitions
export interface NPRAProduct {
  id: string;
  reg_no: string;
  npra_product: string;
  description?: string;
  status: string;
  holder?: string;
  text?: string;
}

export interface NPRAStats {
  total: number;
  timestamp: string;
  error?: string;
}

// Helper function to normalize medicine names for better matching
function normalizeMedicineName(name: string): string[] {
  if (!name) return [];
  
  // Remove trademark symbols and extra characters
  let normalized = name
    .replace(/[®©™]/g, '') // Remove trademark symbols
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .trim()
    .toLowerCase();
  
  // Generate multiple search variations
  const variations = [normalized];
  
  // If name contains numbers, try without numbers
  if (/\d/.test(normalized)) {
    variations.push(normalized.replace(/\d+/g, '').trim());
  }
  
  // If name contains common words, try without them
  const commonWords = ['tablets', 'tablet', 'capsules', 'capsule', 'mg', 'film', 'coated', 'oral', 'powder', 'syrup', 'drops'];
  for (const word of commonWords) {
    if (normalized.includes(word)) {
      const withoutWord = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
      if (withoutWord.length > 2) {
        variations.push(withoutWord);
      }
    }
  }
  
  // Remove duplicates and empty strings
  return [...new Set(variations)].filter(v => v.length > 1);
}

/**
 * Searches the Supabase 'public.medicines' table for official product information.
 * Uses 'product_name' and optionally 'reg_no' (registration number) for lookup.
 * @param productName - The exact or partial name of the product.
 * @param regNumber - The MAL/NOT registration number, if extracted (e.g., MAL19990007T).
 * @returns NPRA data object (product_name, reg_no, status, etc.) or null.
 */
export async function npraProductLookup(
  productName: string, 
  regNumber?: string | null
): Promise<NPRAProduct | null> {
  console.log(`🔍 NPRA Lookup: Searching for "${productName}"${regNumber ? ` with reg_no: ${regNumber}` : ''}`);
  
  const supabase = getSupabaseClient();
  
  // Normalize the product name for better matching
  const searchVariations = normalizeMedicineName(productName);
  console.log(`🔍 NPRA Search variations:`, searchVariations);
  
  // Try each variation until we find a match
  for (const variation of searchVariations) {
    console.log(`🔍 NPRA Trying variation: "${variation}"`);
    
    let query = supabase
      .from('medicines')
      .select('id, reg_no, product, description, status, holder, active_ingredient, generic_name')
      .ilike('product', `%${variation}%`);

    if (regNumber) {
      query = query.or(`reg_no.eq.${regNumber},product.ilike.%${variation}%`);
    } else {
      query = query.limit(1);
    }

    try {
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ NPRA Supabase Error:', error);
        continue; // Try next variation
      }
      
      if (data && data.length > 0) {
        console.log(`✅ NPRA Found: ${data.length} result(s) for "${variation}"`);
        console.log(`📋 Product: ${data[0].product} | Reg: ${data[0].reg_no} | Status: ${data[0].status}`);
        return data[0] as NPRAProduct;
      }
    } catch (err) {
      console.error('❌ NPRA Query Error:', err);
      continue; // Try next variation
    }
  }
  
  console.log(`⚠️ NPRA Not Found: No results for any variation of "${productName}"`);
  return null;
}

/**
 * Enhanced NPRA lookup with multiple search strategies
 * @param productName - The product name to search for
 * @param regNumber - Registration number if available
 * @param activeIngredient - Active ingredient for additional matching
 * @returns Best matching NPRA record or null
 */
export async function enhancedNpraLookup(
  productName: string, 
  regNumber?: string | null, 
  activeIngredient?: string | null
): Promise<NPRAProduct | null> {
  console.log(`🔍 Enhanced NPRA Lookup: "${productName}" | Reg: ${regNumber} | Ingredient: ${activeIngredient}`);
  
  // Strategy 1: Exact registration number match (highest priority)
  if (regNumber) {
    try {
      const supabase = getSupabaseClient();
      const { data: regMatch, error } = await supabase
        .from('medicines')
        .select('*')
        .eq('reg_no', regNumber)
        .single();
      
      if (!error && regMatch) {
        console.log(`✅ NPRA Exact Reg Match: ${regMatch.npra_product}`);
        return regMatch as NPRAProduct;
      }
    } catch (error) {
      console.log(`⚠️ Reg number search failed:`, error);
    }
  }
  
  // Strategy 2: Product name match with active ingredient
  if (activeIngredient) {
    try {
      const supabase = getSupabaseClient();
      const { data: ingredientMatch, error } = await supabase
        .from('medicines')
        .select('*')
        .ilike('product', `%${productName}%`)
        .ilike('active_ingredient', `%${activeIngredient}%`)
        .limit(1)
        .single();
      
      if (!error && ingredientMatch) {
        console.log(`✅ NPRA Ingredient Match: ${ingredientMatch.product}`);
        return ingredientMatch as NPRAProduct;
      }
    } catch (error) {
      console.log(`⚠️ Ingredient search failed:`, error);
    }
  }
  
  // Strategy 3: Fallback to basic product name search
  return await npraProductLookup(productName, regNumber);
}

/**
 * Get all NPRA medicines matching a partial name (for search suggestions)
 * @param partialName - Partial product name
 * @param limit - Maximum number of results
 * @returns Array of matching medicines
 */
export async function searchNpraMedicines(
  partialName: string, 
  limit: number = 10
): Promise<NPRAProduct[]> {
  console.log(`🔍 NPRA Search Suggestions: "${partialName}" (limit: ${limit})`);
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('medicines')
      .select('id, reg_no, product, status')
      .ilike('product', `%${partialName}%`)
      .limit(limit);
    
    if (error) {
      console.error('❌ NPRA Search Error:', error);
      return [];
    }
    
    console.log(`✅ NPRA Search: Found ${data?.length || 0} suggestions`);
    return (data || []) as NPRAProduct[];
  } catch (error) {
    console.error('❌ NPRA Search Exception:', error);
    return [];
  }
}

/**
 * Get NPRA statistics for monitoring
 * @returns Database statistics
 */
export async function getNpraStats(): Promise<NPRAStats> {
  try {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('medicines')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ NPRA Stats Error:', error);
      return { total: 0, timestamp: new Date().toISOString(), error: error.message };
    }
    
    return { 
      total: count || 0, 
      timestamp: new Date().toISOString() 
    };
  } catch (error) {
    console.error('❌ NPRA Stats Exception:', error);
    return { 
      total: 0, 
      timestamp: new Date().toISOString(), 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch lookup for multiple products
 * @param productNames - Array of product names to search
 * @returns Array of NPRA products found
 */
export async function batchNpraLookup(productNames: string[]): Promise<NPRAProduct[]> {
  console.log(`🔍 Batch NPRA Lookup: ${productNames.length} products`);
  
  const results: NPRAProduct[] = [];
  
  // Process in parallel with Promise.allSettled to handle individual failures
  const promises = productNames.map(async (name) => {
    try {
      const result = await npraProductLookup(name);
      return result;
    } catch (error) {
      console.error(`❌ Batch lookup failed for "${name}":`, error);
      return null;
    }
  });
  
  const settledResults = await Promise.allSettled(promises);
  
  settledResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value);
    }
  });
  
  console.log(`✅ Batch lookup complete: ${results.length}/${productNames.length} found`);
  return results;
}

/**
 * Decrements the token count for a user in the public.profiles table.
 * @param userId - The unique user ID (UID from auth.users).
 * @returns True if the token was successfully decremented, False if user is out of tokens or failed.
 */
export async function checkTokenAvailability(userId: string): Promise<boolean> {
    console.log(`🔍 Checking token availability for user: ${userId}`);
    
    const supabase = getSupabaseClient();
    
    // Check current tokens
    const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('tokens')
        .eq('id', userId)
        .single();

    if (selectError) {
        console.error('❌ Token check error:', selectError);
        return false;
    }

    if (!profile || profile.tokens <= 0) {
        console.log(`⚠️ User ${userId} has insufficient tokens (current: ${profile?.tokens || 0})`);
        return false;
    }

    console.log(`✅ User ${userId} has ${profile.tokens} tokens available`);
    return true;
}

export async function decrementToken(userId: string): Promise<boolean> {
    console.log(`🔍 Checking and decrementing tokens for user: ${userId}`);
    
    // 1. Check current tokens
    const supabase = getSupabaseClient();
    const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('tokens')
        .eq('id', userId)
        .single();

    if (selectError) {
        console.error('❌ Token check error:', selectError);
        // Fail safe: If we can't check, assume failure to proceed
        return false;
    }

    if (!profile || profile.tokens <= 0) {
        console.log(`⚠️ User ${userId} out of tokens (current: ${profile?.tokens || 0})`);
        return false;
    }

    // 2. Decrement tokens
    const newCount = profile.tokens - 1;

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ tokens: newCount })
        .eq('id', userId);

    if (updateError) {
        console.error('❌ Token update error:', updateError);
        return false;
    }

    console.log(`✅ User ${userId} tokens decremented. Remaining: ${newCount}`);
    return true;
}

/**
 * Save unified chat message to chat_history table
 * @param chatData - The chat message data to save
 * @returns The saved chat history record
 */
export async function saveChatMessage(chatData: {
    user_id: string;
    message_type: 'user' | 'ai';
    message_text?: string;
    ai_response?: string;
    session_id: string;
    message_sequence: number;
    image_url?: string;
    medicine_name?: string;
    generic_name?: string;
    dosage?: string;
    side_effects?: string[];
    interactions?: string[];
    warnings?: string[];
    storage?: string;
    category?: string;
    confidence?: number;
    language?: string;
    allergies?: string;
    conversation_context?: string;
    conversation_title?: string;
    conversation_preview?: string;
    conversation_tags?: string[];
}): Promise<any> {
    console.log(`🔍 [DEBUG] ===== saveChatMessage FUNCTION CALLED =====`);
    console.log(`🔍 [DEBUG] Input data:`, {
        user_id: chatData.user_id,
        user_id_type: typeof chatData.user_id,
        message_type: chatData.message_type,
        session_id: chatData.session_id,
        message_sequence: chatData.message_sequence,
        has_message_text: !!chatData.message_text,
        has_ai_response: !!chatData.ai_response,
        timestamp: new Date().toISOString()
    });
    
    const supabase = getSupabaseClient();
    console.log(`🔍 [DEBUG] Supabase client created successfully`);
    
    // Prepare data with proper defaults for NOT NULL constraints
    const insertData = {
        ...chatData,
        image_url: chatData.image_url || '', // CRITICAL: Use empty string instead of null for NOT NULL constraint
        language: chatData.language || 'English', // Default language
        message_sequence: chatData.message_sequence || 1, // Default sequence
        created_at: new Date().toISOString() // Explicit timestamp
    };
    
    console.log(`🔍 [DEBUG] About to execute database insert with data:`, {
        table: 'chat_history',
        insertDataKeys: Object.keys(insertData),
        insertDataPreview: {
            user_id: insertData.user_id,
            message_type: insertData.message_type,
            session_id: insertData.session_id,
            message_sequence: insertData.message_sequence
        }
    });
    
    const { data, error } = await supabase
        .from('chat_history')
        .insert([insertData])
        .select()
        .single();
    
    console.log(`🔍 [DEBUG] Database insert result:`, {
        hasData: !!data,
        hasError: !!error,
        errorDetails: error ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
        } : null,
        dataPreview: data ? {
            id: data.id,
            user_id: data.user_id,
            message_type: data.message_type
        } : null
    });
    
    if (error) {
        console.error('❌ CRITICAL: Chat history save error:', error);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        throw error;
    }
    
    console.log(`✅ SUCCESS: Chat message saved for user ${chatData.user_id}`);
    console.log(`🔍 [DEBUG] ===== saveChatMessage FUNCTION COMPLETED =====`);
    return data;
}

/**
 * Get user scan history using service role client to bypass RLS policies
 * @param userId - The user ID to get scan history for
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of scan history records
 */
