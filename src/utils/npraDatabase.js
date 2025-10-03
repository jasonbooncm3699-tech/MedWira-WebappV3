/**
 * Node.js/JavaScript implementation of the NPRA tool logic.
 * Connects to Supabase to retrieve official, verified product data from the 'public.medicines' table.
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables for Supabase connection
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize the Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Searches the Supabase 'public.medicines' table for official product information.
 * Uses 'product_name' and optionally 'reg_no' (registration number) for lookup.
 * @param {string} productName - The exact or partial name of the product.
 * @param {string} [regNumber] - The MAL/NOT registration number, if extracted (e.g., MAL19990007T).
 * @returns {Promise<Object|null>} NPRA data object (product_name, reg_no, status, etc.) or null.
 */
async function npraProductLookup(productName, regNumber = null) {
  console.log(`🔍 NPRA Lookup: Searching for "${productName}"${regNumber ? ` with reg_no: ${regNumber}` : ''}`);
  
  let query = supabaseClient
    .from('medicines') // Targeting the specific table: public.medicines
    .select('id, reg_no, npra_product, description, status, holder, text') // Select all relevant columns from your table
    .ilike('npra_product', `%${productName}%`); // Search the NPRA product name column

  if (regNumber) {
    // If a registration number is provided, search both the product name and the registration number column
    query = query.or(`reg_no.eq.${regNumber},npra_product.ilike.%${productName}%`);
  } else {
    // Apply a simple limit if searching by name only
    query = query.limit(1);
  }

  try {
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ NPRA Supabase Error:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      console.log(`✅ NPRA Found: ${data.length} result(s) for "${productName}"`);
      console.log(`📋 Product: ${data[0].npra_product} | Reg: ${data[0].reg_no} | Status: ${data[0].status}`);
      return data[0];
    } else {
      console.log(`⚠️ NPRA Not Found: No results for "${productName}"`);
      return null;
    }
  } catch (error) {
    console.error('❌ NPRA Database Exception:', error);
    return null;
  }
}

/**
 * Enhanced NPRA lookup with multiple search strategies
 * @param {string} productName - The product name to search for
 * @param {string} [regNumber] - Registration number if available
 * @param {string} [activeIngredient] - Active ingredient for additional matching
 * @returns {Promise<Object|null>} Best matching NPRA record or null
 */
async function enhancedNpraLookup(productName, regNumber = null, activeIngredient = null) {
  console.log(`🔍 Enhanced NPRA Lookup: "${productName}" | Reg: ${regNumber} | Ingredient: ${activeIngredient}`);
  
  // Strategy 1: Exact registration number match (highest priority)
  if (regNumber) {
    const regMatch = await supabaseClient
      .from('medicines')
      .select('*')
      .eq('reg_no', regNumber)
      .single();
    
    if (!regMatch.error && regMatch.data) {
      console.log(`✅ NPRA Exact Reg Match: ${regMatch.data.npra_product}`);
      return regMatch.data;
    }
  }
  
  // Strategy 2: Product name match with active ingredient
  if (activeIngredient) {
    const ingredientMatch = await supabaseClient
      .from('medicines')
      .select('*')
      .ilike('npra_product', `%${productName}%`)
      .ilike('text', `%${activeIngredient}%`)
      .limit(1)
      .single();
    
    if (!ingredientMatch.error && ingredientMatch.data) {
      console.log(`✅ NPRA Ingredient Match: ${ingredientMatch.data.npra_product}`);
      return ingredientMatch.data;
    }
  }
  
  // Strategy 3: Fallback to basic product name search
  return await npraProductLookup(productName, regNumber);
}

/**
 * Get all NPRA medicines matching a partial name (for search suggestions)
 * @param {string} partialName - Partial product name
 * @param {number} [limit=10] - Maximum number of results
 * @returns {Promise<Array>} Array of matching medicines
 */
async function searchNpraMedicines(partialName, limit = 10) {
  console.log(`🔍 NPRA Search Suggestions: "${partialName}" (limit: ${limit})`);
  
  try {
    const { data, error } = await supabaseClient
      .from('medicines')
      .select('id, reg_no, npra_product, status')
      .ilike('npra_product', `%${partialName}%`)
      .limit(limit);
    
    if (error) {
      console.error('❌ NPRA Search Error:', error);
      return [];
    }
    
    console.log(`✅ NPRA Search: Found ${data?.length || 0} suggestions`);
    return data || [];
  } catch (error) {
    console.error('❌ NPRA Search Exception:', error);
    return [];
  }
}

/**
 * Get NPRA statistics for monitoring
 * @returns {Promise<Object>} Database statistics
 */
async function getNpraStats() {
  try {
    const { count, error } = await supabaseClient
      .from('medicines')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ NPRA Stats Error:', error);
      return { total: 0, error: error.message };
    }
    
    return { total: count, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('❌ NPRA Stats Exception:', error);
    return { total: 0, error: error.message };
  }
}

/**
 * Decrements the token count for a user in the public.profiles table.
 * @param {string} userId - The unique user ID (UID from auth.users).
 * @returns {Promise<boolean>} True if the token was successfully decremented, False if user is out of tokens or failed.
 */
async function decrementToken(userId) {
    console.log(`🔍 Checking and decrementing tokens for user: ${userId}`);
    
    // 1. Check current tokens
    const { data: profile, error: selectError } = await supabaseClient
        .from('profiles')
        .select('token_count')
        .eq('id', userId)
        .single();

    if (selectError) {
        console.error('❌ Token check error:', selectError);
        // Fail safe: If we can't check, assume failure to proceed
        return false;
    }

    if (!profile || profile.token_count <= 0) {
        console.log(`⚠️ User ${userId} out of tokens (current: ${profile?.token_count || 0})`);
        return false;
    }

    // 2. Decrement tokens
    const newCount = profile.token_count - 1;

    const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ token_count: newCount, updated_at: new Date().toISOString() })
        .eq('id', userId);

    if (updateError) {
        console.error('❌ Token update error:', updateError);
        return false;
    }

    console.log(`✅ User ${userId} tokens decremented. Remaining: ${newCount}`);
    return true;
}

module.exports = { 
  npraProductLookup, 
  enhancedNpraLookup, 
  searchNpraMedicines, 
  getNpraStats,
  decrementToken
};
