'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, DatabaseService, User } from './supabase';

interface AuthContextType {
  user: User | null;
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

    // Listen for auth changes (OAuth login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Check if user exists in database, if not create them
            let userData;
            try {
              userData = await DatabaseService.getUser(session.user.id);
            } catch (error) {
              // User doesn't exist, create them (OAuth new user)
              console.log('📝 Creating new user record for OAuth user...');
              const userName = session.user.user_metadata?.full_name || 
                              session.user.user_metadata?.name || 
                              session.user.user_metadata?.user_name ||
                              'User';
              
              await DatabaseService.createUser({
                id: session.user.id,
                email: session.user.email!,
                name: userName,
                tokens: 30,
                subscription_tier: 'free',
              });
              
              userData = await DatabaseService.getUser(session.user.id);
            }
            
            setUser(userData);
            console.log('✅ User authenticated:', userData.email);
          } catch (error) {
            console.error('❌ Error fetching user data:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          console.log('👋 User signed out');
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      await supabase.auth.signOut();
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Error logging out:', error);
    }
  };

  const updateTokens = async (newTokenCount: number) => {
    if (!user) return;
    
    try {
      const updatedUser = await DatabaseService.updateUser(user.id, {
        tokens: newTokenCount
      });
      setUser(updatedUser);
      console.log('✅ Tokens updated:', newTokenCount);
    } catch (error) {
      console.error('❌ Error updating tokens:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
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
