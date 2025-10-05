/**
 * NPRA Database Utility (TypeScript)
 * 
 * Connects to Supabase to retrieve official, verified product data from the 'public.medicines' table.
 */

import { createClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client to avoid build-time errors
let supabaseClient: any = null;

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

// MOVED TO TOP: getUserScanHistory function
export async function getUserScanHistory(userId: string, limit: number = 50): Promise<any[]> {
    console.log(`🔍 Getting scan history for user: ${userId}`);
    
    try {
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
            .from('scan_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('❌ Scan history fetch error:', error);
            throw error;
        }
        
        console.log(`✅ Retrieved ${data?.length || 0} scan history records for user ${userId}`);
        return data || [];
    } catch (error) {
        console.error('❌ Error in getUserScanHistory:', error);
        return [];
    }
}

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
  let query = supabase
    .from('medicines') // Targeting the specific table: public.medicines
    .select('id, reg_no, product, description, status, holder, active_ingredient, generic_name') // Select all relevant columns
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
      return data[0] as NPRAProduct;
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
        .select('token_count')
        .eq('id', userId)
        .single();

    if (selectError) {
        console.error('❌ Token check error:', selectError);
        return false;
    }

    if (!profile || profile.token_count <= 0) {
        console.log(`⚠️ User ${userId} has insufficient tokens (current: ${profile?.token_count || 0})`);
        return false;
    }

    console.log(`✅ User ${userId} has ${profile.token_count} tokens available`);
    return true;
}

export async function decrementToken(userId: string): Promise<boolean> {
    console.log(`🔍 Checking and decrementing tokens for user: ${userId}`);
    
    // 1. Check current tokens
    const supabase = getSupabaseClient();
    const { data: profile, error: selectError } = await supabase
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

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ token_count: newCount })
        .eq('id', userId);

    if (updateError) {
        console.error('❌ Token update error:', updateError);
        return false;
    }

    console.log(`✅ User ${userId} tokens decremented. Remaining: ${newCount}`);
    return true;
}

/**
 * Save scan history using service role client to bypass RLS policies
 * @param scanData - The scan history data to save
 * @returns The saved scan history record
 */
export async function saveScanHistory(scanData: {
    user_id: string;
    image_url: string;
    medicine_name?: string;
    generic_name?: string;
    dosage?: string;
    side_effects?: string[];
    interactions?: string[];
    warnings?: string[];
    storage?: string;
    category?: string;
    confidence?: number;
    language: string;
    allergies?: string;
}): Promise<any> {
    console.log(`🔍 Saving scan history for user: ${scanData.user_id}`);
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
        .from('scan_history')
        .insert([scanData])
        .select()
        .single();
    
    if (error) {
        console.error('❌ Scan history save error:', error);
        throw error;
    }
    
    console.log(`✅ Scan history saved for user ${scanData.user_id}`);
    return data;
}

/**
 * Get user scan history using service role client to bypass RLS policies
 * @param userId - The user ID to get scan history for
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of scan history records
 */
