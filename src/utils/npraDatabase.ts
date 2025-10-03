/**
 * NPRA Database Utility (TypeScript)
 * 
 * Connects to Supabase to retrieve official, verified product data from the 'public.medicines' table.
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase connection
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Initialize the Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  
  let query = supabaseClient
    .from('medicines') // Targeting the specific table: public.medicines
    .select('id, reg_no, npra_product, description, status, holder, text') // Select all relevant columns
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
      const { data: regMatch, error } = await supabaseClient
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
      const { data: ingredientMatch, error } = await supabaseClient
        .from('medicines')
        .select('*')
        .ilike('npra_product', `%${productName}%`)
        .ilike('text', `%${activeIngredient}%`)
        .limit(1)
        .single();
      
      if (!error && ingredientMatch) {
        console.log(`✅ NPRA Ingredient Match: ${ingredientMatch.npra_product}`);
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
    const { count, error } = await supabaseClient
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
