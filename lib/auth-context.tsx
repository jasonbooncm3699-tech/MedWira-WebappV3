'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, DatabaseService, User } from './supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateTokens: (newTokenCount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        console.log('🔍 Checking existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Found existing session for:', session.user.email);
          try {
            // Get user data from our users table
            const userData = await DatabaseService.getUser(session.user.id);
            console.log('✅ User data loaded:', userData.email);
            setUser(userData);
          } catch (dbError) {
            console.error('❌ Failed to load user data:', dbError);
            // Don't fail completely - user might still be authenticated
          }
        } else {
          console.log('ℹ️ No existing session found');
        }
      } catch (error) {
        console.error('💥 Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const userData = await DatabaseService.getUser(session.user.id);
            setUser(userData);
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update last login
      if (data.user) {
        await DatabaseService.updateUser(data.user.id, {
          last_login: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      console.log('📝 Attempting registration for:', email, 'name:', name);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('❌ Registration error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Supabase registration successful');

      if (data.user) {
        try {
          // Create user record in our users table
          await DatabaseService.createUser({
            email: data.user.email!,
            name,
            tokens: 10, // Free tier starts with 10 tokens
            subscription_tier: 'free',
          });
          console.log('✅ User record created in database');
        } catch (dbError) {
          console.error('💥 Failed to create user record:', dbError);
          return { success: false, error: 'Registration completed but failed to create user profile. Please contact support.' };
        }
      }

      console.log('✅ Registration fully successful');
      return { success: true };
    } catch (error) {
      console.error('💥 Registration exception:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateTokens = async (newTokenCount: number) => {
    if (!user) return;
    
    try {
      const updatedUser = await DatabaseService.updateUser(user.id, {
        tokens: newTokenCount
      });
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating tokens:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register,
      logout, 
      isLoading,
      updateTokens
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
