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
    console.log('🔄 refreshUser called - checking session...');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('📡 Session check result:', {
        hasSession: !!data.session,
        hasError: !!error,
        email: data.session?.user?.email || 'none'
      });
      
      if (error) {
        console.error('❌ Session error:', error);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        console.log('ℹ️ No active session found');
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('✅ Active session found for:', data.session.user.email);
      
      // Fetch user data from users table
      const userData = await fetchUserData(data.session.user.id);
      if (userData) {
        console.log('✅ User data loaded from database:', {
          name: userData.name,
          tokens: userData.tokens,
          tier: userData.subscription_tier
        });
        setUser(userData);
      } else {
        console.log('⚠️ No user data in database, creating fallback user');
        // Fallback to session user if no DB record
        const fallbackUser = {
          id: data.session.user.id,
          email: data.session.user.email || '',
          name: data.session.user.user_metadata?.full_name || 
                data.session.user.user_metadata?.name || 
                data.session.user.email?.split('@')[0] || 
                'User',
          tokens: 0,
          subscription_tier: 'free'
        };
        console.log('📝 Setting fallback user:', fallbackUser);
        setUser(fallbackUser);
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
    console.log('🚀 AuthProvider initializing...');
    refreshUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, {
        hasSession: !!session,
        email: session?.user?.email || 'none',
        userId: session?.user?.id || 'none'
      });
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🎉 User signed in event detected!');
        setIsLoading(true);
        
        try {
          // Wait a moment for database to be updated
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Fetch user data from users table
          const userData = await fetchUserData(session.user.id);
          if (userData) {
            console.log('✅ User data loaded after sign-in:', {
              name: userData.name,
              email: userData.email,
              tokens: userData.tokens,
              tier: userData.subscription_tier
            });
            setUser(userData);
          } else {
            console.log('⚠️ No user data found, creating fallback user');
            // Fallback to session user if no DB record
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name || 
                    session.user.email?.split('@')[0] || 
                    'User',
              tokens: 0,
              subscription_tier: 'free'
            };
            console.log('📝 Setting fallback user after sign-in:', fallbackUser);
            setUser(fallbackUser);
          }
        } catch (error) {
          console.error('❌ Error handling sign-in:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out event detected');
        setUser(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed, updating user data...');
        // Refresh user data when token is refreshed
        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          if (userData) {
            setUser(userData);
          }
        }
      }
    });
    
    return () => {
      console.log('🧹 Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
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
