import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Enhanced Supabase client configuration for better session handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure sessions persist across browser sessions
    persistSession: true,
    // Auto refresh tokens
    autoRefreshToken: true,
    // Detect session in URL (important for OAuth redirects)
    detectSessionInUrl: true,
    // Storage key for session persistence
    storageKey: 'medwira-auth-token',
    // Storage mechanism
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Flow type for OAuth
    flowType: 'pkce'
  },
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'medwira-webapp'
    }
  }
})

// Database types
export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  tokens: number
  subscription_tier: 'free' | 'premium' | 'pro'
  created_at: string
  updated_at: string
  last_login: string
}

export interface ScanHistory {
  id: string
  user_id: string
  image_url: string
  medicine_name?: string
  generic_name?: string
  dosage?: string
  side_effects?: string[]
  interactions?: string[]
  warnings?: string[]
  storage?: string
  category?: string
  confidence?: number
  language: string
  allergies?: string
  created_at: string
}

export interface NPRAMedicine {
  id: number
  ref_no: string
  reg_no: string
  product: string
  status: string
  description?: string | null
  holder: string
  holder_osa?: string | null
  manufacturer: string
  manufacturer_osa?: string | null
  importer?: string | null
  importer_osa?: string | null
  date_reg?: string | null
  date_end?: string | null
  active_ingredient: string
  mdc_code?: string | null
  generic_name: string
  created_at?: string
}

// Database helper functions
export class DatabaseService {
  // User operations
  static async createUser(userData: Omit<User, 'created_at' | 'updated_at' | 'last_login'>) {
    console.log('🔍 Creating user with data:', userData);
    
    // First, check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userData.id)
      .single();
    
    if (existingUser && !checkError) {
      console.log('⚠️ User already exists, returning existing user:', existingUser);
      return existingUser;
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        // Ensure we're using the Supabase Auth user ID
        id: userData.id
      }])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Database createUser error:', error);
      throw error;
    }
    
    console.log('✅ User created successfully:', data);
    return data
  }

  static async getUser(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  }

  static async updateUser(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Scan history operations
  static async saveScanHistory(scanData: Omit<ScanHistory, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('scan_history')
      .insert([scanData])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async getUserScanHistory(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  }

  // NPRA medicine database operations (using existing 'medicines' table)
  static async searchNPRA(query: string, limit = 20) {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .or(`product.ilike.%${query}%,generic_name.ilike.%${query}%,active_ingredient.ilike.%${query}%`)
      .limit(limit)
    
    if (error) throw error
    return data
  }

  static async getNPRAMedicine(registrationNumber: string) {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .or(`reg_no.eq.${registrationNumber},ref_no.eq.${registrationNumber}`)
      .single()
    
    if (error) throw error
    return data
  }
}
