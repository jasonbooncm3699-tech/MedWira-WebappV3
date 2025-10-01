'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, DatabaseService, User } from './supabase';

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateTokens: (newTokenCount: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to fetch user data with retry logic
  const fetchUserData = useCallback(async (userId: string, retries = 3): Promise<User | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📡 Fetching user data (attempt ${attempt}/${retries})...`);
        const userData = await DatabaseService.getUser(userId);
        
        console.log('✅ User data loaded:', {
          email: userData.email,
          name: userData.name,
          tokens: userData.tokens,
          tier: userData.subscription_tier
        });
        
        return userData;
      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt} failed:`, error);
        
        if (attempt < retries) {
          // Wait before retrying (exponential backoff)
          const delay = attempt * 500; // 500ms, 1000ms, 1500ms
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ All retry attempts failed');
          return null;
        }
      }
    }
    return null;
  }, []); // Stable function, no dependencies

  // Helper function to create new user with proper error handling
  const createNewUser = useCallback(async (session: any): Promise<User | null> => {
    try {
      const userName = 
        session.user.user_metadata?.full_name || 
        session.user.user_metadata?.name || 
        session.user.user_metadata?.user_name ||
        session.user.email?.split('@')[0] ||
        'User';

      console.log('📝 Creating new user record:', {
        id: session.user.id,
        email: session.user.email,
        name: userName
      });

      await DatabaseService.createUser({
        id: session.user.id,
        email: session.user.email!,
        name: userName,
        tokens: 30,
        subscription_tier: 'free',
      });

      console.log('✅ User record created successfully');
      
      // Fetch the newly created user with retry
      return await fetchUserData(session.user.id, 3);
    } catch (error) {
      console.error('❌ Failed to create user record:', error);
      
      // Even if creation fails, try to fetch (maybe callback route created it)
      console.log('🔄 Attempting to fetch user anyway...');
      return await fetchUserData(session.user.id, 2);
    }
  }, [fetchUserData]); // Depends on fetchUserData

  // Refresh user data manually
  const refreshUser = useCallback(async () => {
    if (!user) return;
    
    try {
      const userData = await fetchUserData(user.id, 1);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    // Check for existing session on mount
    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Found existing session for:', session.user.email);
          
          // Fetch user data with retry logic
          const userData = await fetchUserData(session.user.id, 3);
          
          if (userData) {
            setUser(userData);
          } else {
            console.warn('⚠️ Could not load user data, but session exists');
            // Set a minimal user object from session
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name || 
                    'User',
              tokens: 0, // Will be updated when DB record is available
              subscription_tier: 'free',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
            });
          }
        } else {
          console.log('ℹ️ No existing session found');
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes (OAuth login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, {
          hasSession: !!session,
          email: session?.user?.email || 'none'
        });
        
        if (event === 'SIGNED_IN' && session?.user) {
          setIsLoading(true); // Show loading during user data fetch
          
          try {
            // First, try to get existing user
            let userData = await fetchUserData(session.user.id, 2);
            
            // If user doesn't exist, create them
            if (!userData) {
              console.log('👤 User not found in database, creating...');
              userData = await createNewUser(session);
            }
            
            if (userData) {
              setUser(userData);
              console.log('✅ User authenticated:', {
                email: userData.email,
                tokens: userData.tokens,
                tier: userData.subscription_tier
              });
            } else {
              console.error('❌ Could not load or create user data');
              // Set minimal user from session as fallback
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || 'User',
                tokens: 0,
                subscription_tier: 'free',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error('❌ Error during sign in:', error);
          } finally {
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
          console.log('👋 User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
          // Refresh user data to ensure we have latest
          if (session?.user && user) {
            const userData = await fetchUserData(session.user.id, 1);
            if (userData) {
              setUser(userData);
            }
          }
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserData, createNewUser]); // user intentionally omitted to prevent re-subscription

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies

  const updateTokens = useCallback(async (newTokenCount: number) => {
    if (!user) {
      console.warn('⚠️ Cannot update tokens - no user logged in');
      return;
    }
    
    try {
      console.log('💰 Updating tokens:', {
        from: user.tokens,
        to: newTokenCount
      });
      
      const updatedUser = await DatabaseService.updateUser(user.id, {
        tokens: newTokenCount
      });
      
      setUser(updatedUser);
      console.log('✅ Tokens updated successfully:', newTokenCount);
    } catch (error) {
      console.error('❌ Error updating tokens:', error);
      throw error; // Re-throw so caller can handle
    }
  }, [user]); // Depends on user state

  const contextValue: AuthContextType = {
    user,
    logout,
    isLoading,
    updateTokens,
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
