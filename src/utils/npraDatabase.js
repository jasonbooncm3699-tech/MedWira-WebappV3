/**
 * Node.js/JavaScript implementation of the NPRA tool logic.
 * Connects to Supabase to retrieve official, verified product data from the 'public.medicines' table.
 */

const { createClient } = require('@supabase/supabase-js');

// Lazy initialization of Supabase client to avoid build-time errors
let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Use service role key for server-side operations to bypass RLS policies
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase environment variables are not configured');
    }
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

/**
 * Searches the Supabase 'public.medicines' table for official product information.
 * Uses 'product_name' and optionally 'reg_no' (registration number) for lookup.
 * @param {string} productName - The exact or partial name of the product.
 * @param {string} [regNumber] - The MAL/NOT registration number, if extracted (e.g., MAL19990007T).
 * @returns {Promise<Object|null>} NPRA data object (product_name, reg_no, status, etc.) or null.
 */
async function npraProductLookup(productName, regNumber = null) {
  console.log(`🔍 NPRA Lookup: Searching for "${productName}"${regNumber ? ` with reg_no: ${regNumber}` : ''}`);
  
  const supabase = getSupabaseClient();
  let query = supabase
    .from('medicines') // Targeting the specific table: public.medicines
    .select('id, reg_no, product, description, status, holder, active_ingredient, generic_name') // Select all relevant columns from your table
    .ilike('product', `%${productName}%`); // Search the product name column

  if (regNumber) {
    // If a registration number is provided, search both the product name and the registration number column
    query = query.or(`reg_no.eq.${regNumber},product.ilike.%${productName}%`);
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
      console.log(`📋 Product: ${data[0].product} | Reg: ${data[0].reg_no} | Status: ${data[0].status}`);
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
    const supabase = getSupabaseClient();
    const regMatch = await supabase
      .from('medicines')
      .select('*')
      .eq('reg_no', regNumber)
      .single();
    
    if (!regMatch.error && regMatch.data) {
      console.log(`✅ NPRA Exact Reg Match: ${regMatch.data.product}`);
      return regMatch.data;
    }
  }
  
  // Strategy 2: Product name match with active ingredient
  if (activeIngredient) {
    const ingredientMatch = await supabase
      .from('medicines')
      .select('*')
        .ilike('product', `%${productName}%`)
      .ilike('text', `%${activeIngredient}%`)
      .limit(1)
      .single();
    
    if (!ingredientMatch.error && ingredientMatch.data) {
      console.log(`✅ NPRA Ingredient Match: ${ingredientMatch.data.product}`);
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
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
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
async function checkTokenAvailability(userId, requiredCost = 1) {
    console.log(`🔍 Checking token availability for user: ${userId} (required: ${requiredCost})`);
    
    const supabase = getSupabaseClient();
    
    // Check current tokens with more detailed logging
    const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('token_count, id, email')
        .eq('id', userId)
        .single();

    console.log(`🔍 Token check query result:`, { profile, selectError });

    if (selectError || !profile) {
        console.error('❌ Token check DB Error:', selectError || 'Profile not found');
        return { isAvailable: false, reason: "DATABASE_ERROR" };
    }

    console.log(`🔍 User ${userId} profile found:`, {
        id: profile.id,
        token_count: profile.token_count,
        email: profile.email
    });

    if (profile.token_count < requiredCost) {
        console.log(`⚠️ User ${userId} has insufficient tokens (current: ${profile.token_count}, required: ${requiredCost})`);
        return { isAvailable: false, reason: "INSUFFICIENT_TOKENS" };
    }

    console.log(`✅ User ${userId} has sufficient tokens.`);
    return { isAvailable: true, reason: "SUFFICIENT" };
}

async function decrementToken(userId) {
    console.log(`🔍 Decrementing 1 token for user: ${userId}`);
    
    // We assume checkTokenAvailability was called successfully beforehand.
    const supabase = getSupabaseClient();
    
    // Use atomic decrement operation - only decrement if token_count > 0
    const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ token_count: supabase.raw('token_count - 1') })
        .eq('id', userId)
        .gt('token_count', 0) // Only update if token_count > 0
        .select('token_count')
        .single();

    if (updateError) {
        console.error('❌ Token update error:', updateError);
        return false;
    }

    if (!data) {
        console.warn(`⚠️ No rows updated for user ${userId} - likely insufficient tokens`);
        return false;
    }

    console.log(`✅ User ${userId} token decremented by 1. Remaining: ${data.token_count}`);
    return true;
}

module.exports = { 
  npraProductLookup, 
  enhancedNpraLookup, 
  searchNpraMedicines, 
  getNpraStats,
  checkTokenAvailability,
  decrementToken
};
