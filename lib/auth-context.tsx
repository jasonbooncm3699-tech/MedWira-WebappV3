'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  email: string;
  name: string;
  tokens: number;
  subscription_tier: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data from Supabase users table
  const fetchUserData = useCallback(async (userId: string): Promise<User | null> => {
    try {
      console.log('📡 Fetching user data from users table...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user data:', error);
        return null;
      }

      if (data) {
        console.log('✅ User data loaded:', {
          email: data.email,
          name: data.name,
          tokens: data.tokens,
          tier: data.subscription_tier
        });
        return data as User;
      }

      return null;
    } catch (error) {
      console.error('❌ Exception fetching user data:', error);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Fetch user data from users table
      const userData = await fetchUserData(data.session.user.id);
      if (userData) {
        setUser(userData);
      } else {
        // Fallback to session user if no DB record
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          name: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'User',
          tokens: 0,
          subscription_tier: 'free'
        });
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');
      await supabase.auth.signOut();
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Error logging out:', error);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, {
        hasSession: !!session,
        email: session?.user?.email || 'none'
      });
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user data from users table
        const userData = await fetchUserData(session.user.id);
        if (userData) {
          setUser(userData);
          console.log('✅ User authenticated:', {
            email: userData.email,
            tokens: userData.tokens,
            tier: userData.subscription_tier
          });
        } else {
          // Fallback to session user if no DB record
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            tokens: 0,
            subscription_tier: 'free'
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        console.log('👋 User signed out');
      }
    });
    
    return () => authListener.subscription.unsubscribe();
  }, [refreshUser, fetchUserData]);

  const contextValue: AuthContextType = {
    user,
    logout,
    isLoading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
