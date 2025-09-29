import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  name: string
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
  id: string
  registration_number: string
  medicine_name: string
  generic_name: string
  manufacturer: string
  dosage_form: string
  strength: string
  active_ingredients: string[]
  therapeutic_class: string
  registration_date: string
  expiry_date?: string
  status: 'active' | 'expired' | 'suspended'
  country: string
}

// Database helper functions
export class DatabaseService {
  // User operations
  static async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()
    
    if (error) throw error
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

  // NPRA medicine database operations
  static async searchNPRA(query: string, limit = 20) {
    const { data, error } = await supabase
      .from('npra_medicines')
      .select('*')
      .or(`medicine_name.ilike.%${query}%,generic_name.ilike.%${query}%`)
      .eq('status', 'active')
      .limit(limit)
    
    if (error) throw error
    return data
  }

  static async getNPRAMedicine(registrationNumber: string) {
    const { data, error } = await supabase
      .from('npra_medicines')
      .select('*')
      .eq('registration_number', registrationNumber)
      .single()
    
    if (error) throw error
    return data
  }
}
