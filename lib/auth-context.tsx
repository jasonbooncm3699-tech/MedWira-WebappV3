'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ErrorInfo } from 'react';
import { supabase } from './supabase';

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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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
      // CRITICAL: Check for session in URL first (OAuth redirects)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthCode = urlParams.has('code') || urlParams.has('access_token');
        
        if (hasAuthCode) {
          console.log('🔗 OAuth redirect detected in URL, processing session...');
          // Let Supabase handle the URL session detection
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Enhanced session retrieval with better error handling
      const { data, error } = await supabase.auth.getSession();
      
      // Enhanced session debugging with more detailed inspection
      const sessionData = data?.session;
      const sessionUser = sessionData?.user;
      
      // Additional debugging: Check all storage locations directly
      let localStorageSession = null;
      let sessionStorageSession = null;
      let cookieSession = null;
      
      if (typeof window !== 'undefined') {
        try {
          // Check localStorage with multiple possible keys
          const storedSession = localStorage.getItem('medwira-auth-token') || 
                               localStorage.getItem('sb-auth-token') ||
                               localStorage.getItem('supabase.auth.token');
          localStorageSession = storedSession ? JSON.parse(storedSession) : null;
          
          // Check sessionStorage with multiple possible keys
          const sessionStoredSession = sessionStorage.getItem('medwira-auth-token') || 
                                      sessionStorage.getItem('sb-auth-token') ||
                                      sessionStorage.getItem('supabase.auth.token');
          sessionStorageSession = sessionStoredSession ? JSON.parse(sessionStoredSession) : null;
          
          // Check cookies with multiple possible keys
          const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('medwira-auth-token=') || 
                        row.startsWith('sb-auth-token=') ||
                        row.startsWith('supabase.auth.token='))
            ?.split('=')[1];
          cookieSession = cookieValue ? JSON.parse(decodeURIComponent(cookieValue)) : null;
          
          // Debug: List all localStorage keys to see what's actually stored
          console.log('🔍 All localStorage keys:', Object.keys(localStorage));
          console.log('🔍 All sessionStorage keys:', Object.keys(sessionStorage));
          console.log('🔍 All cookies:', document.cookie);
        } catch (e) {
          console.log('⚠️ Error reading storage sessions:', e);
        }
      }
      
      console.log('📡 Raw session data:', {
        hasData: !!data,
        hasSession: !!sessionData,
        hasUser: !!sessionUser,
        sessionType: typeof sessionData,
        sessionValue: sessionData,
        sessionKeys: sessionData ? Object.keys(sessionData) : 'no-session',
        userKeys: sessionUser ? Object.keys(sessionUser) : 'no-user',
        emailValue: sessionUser?.email,
        emailType: typeof sessionUser?.email,
        userId: sessionUser?.id,
        hasError: !!error,
        errorMessage: error?.message,
        // Additional debugging for React error #18
        sessionNullCheck: sessionData === null,
        sessionUndefinedCheck: sessionData === undefined,
        sessionObjectCheck: sessionData && typeof sessionData === 'object',
        // Storage debugging - check all locations
        hasLocalStorageSession: !!localStorageSession,
        localStorageSessionType: typeof localStorageSession,
        localStorageKeys: localStorageSession ? Object.keys(localStorageSession) : 'no-localstorage',
        hasSessionStorageSession: !!sessionStorageSession,
        sessionStorageSessionType: typeof sessionStorageSession,
        sessionStorageKeys: sessionStorageSession ? Object.keys(sessionStorageSession) : 'no-sessionstorage',
        hasCookieSession: !!cookieSession,
        cookieSessionType: typeof cookieSession,
        cookieKeys: cookieSession ? Object.keys(cookieSession) : 'no-cookies'
      });
      
      if (error) {
        console.error('❌ Session error:', error);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // More robust session validation with detailed checks
      if (!sessionData || sessionData === null || sessionData === undefined) {
        console.log('ℹ️ No session object found or session is null/undefined');
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (typeof sessionData !== 'object') {
        console.log('ℹ️ Session is not an object:', typeof sessionData, sessionData);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (!sessionUser || sessionUser === null || sessionUser === undefined) {
        console.log('ℹ️ No user object in session or user is null/undefined');
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (typeof sessionUser !== 'object') {
        console.log('ℹ️ Session user is not an object:', typeof sessionUser, sessionUser);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // DEFENSIVE: Safe property access using optional chaining
      const userId = sessionUser?.id;
      const userEmail = sessionUser?.email;
      
      // DEFENSIVE: Validate session user object properties individually
      if (!userId || typeof userId !== 'string') {
        console.error('❌ Invalid session user ID:', userId);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
        console.error('❌ Invalid session user email:', userEmail);
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('✅ Valid session found for:', userEmail);
      
      // Fetch user data from users table
      const userData = await fetchUserData(userId);
      if (userData) {
        console.log('✅ User data loaded from database:', {
          name: userData.name,
          tokens: userData.tokens,
          tier: userData.subscription_tier
        });
        setUser(userData);
      } else {
        console.log('⚠️ No user data in database, creating fallback user');
        // DEFENSIVE: Safe property access for fallback user creation
        const fallbackUser = {
          id: userId,
          email: userEmail,
          name: sessionUser?.user_metadata?.full_name || 
                sessionUser?.user_metadata?.name || 
                userEmail?.split('@')[0] || 
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

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only initialize auth after hydration
    if (!isHydrated) return;
    
    console.log('🚀 AuthProvider initializing...');
    
    // DEFENSIVE: Use setTimeout to prevent React error #18 (hydration mismatch)
    const initializeAuth = async () => {
      try {
        console.log('🚀 Starting auth initialization...');
        
        // First, let Supabase detect any session in the URL
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('code') || urlParams.has('access_token')) {
            console.log('🔗 URL session detected, waiting for processing...');
            // Give Supabase time to process the URL session
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        await refreshUser();
        setIsInitialized(true);
        console.log('✅ Auth initialization completed');
      } catch (error) {
        console.error('❌ Error during auth initialization:', error);
        setIsLoading(false);
        setIsInitialized(true);
      }
    };
    
    // Defer initialization to next tick to avoid hydration issues
    setTimeout(initializeAuth, 0);
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // DEFENSIVE: Prevent processing auth events before initialization is complete
      if (!isInitialized) {
        console.log('⏳ Skipping auth event - not yet initialized:', event);
        return;
      }
      
      console.log('🔄 Auth state changed:', event, {
        hasSession: !!session,
        sessionType: typeof session,
        sessionKeys: session ? Object.keys(session) : 'no-session',
        hasUser: !!session?.user,
        userKeys: session?.user ? Object.keys(session.user) : 'no-user',
        email: session?.user?.email,
        emailType: typeof session?.user?.email,
        userId: session?.user?.id
      });
      
      if (event === 'SIGNED_IN') {
        console.log('🎉 User signed in event detected!');
        setIsLoading(true);
        
        try {
          // DEFENSIVE: Comprehensive session validation before any property access
          if (!session) {
            console.error('❌ SIGNED_IN event but session is null/undefined');
            setIsLoading(false);
            return;
          }

          if (!session.user) {
            console.error('❌ SIGNED_IN event but session.user is null/undefined');
            setIsLoading(false);
            return;
          }

          // DEFENSIVE: Safe property access using optional chaining
          const sessionUser = session.user;
          const userId = sessionUser?.id;
          const userEmail = sessionUser?.email;
          
          // DEFENSIVE: Validate each property individually
          if (!userId || typeof userId !== 'string') {
            console.error('❌ Invalid user ID in SIGNED_IN event:', userId);
            setIsLoading(false);
            return;
          }

          if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
            console.error('❌ Invalid user email in SIGNED_IN event:', userEmail);
            setIsLoading(false);
            return;
          }

          console.log('✅ Valid SIGNED_IN session for:', userEmail);
          
          // Wait a moment for database to be updated
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Fetch user data from users table
          const userData = await fetchUserData(userId);
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
            // DEFENSIVE: Safe property access for fallback user creation
            const fallbackUser = {
              id: userId,
              email: userEmail,
              name: sessionUser?.user_metadata?.full_name || 
                    sessionUser?.user_metadata?.name || 
                    userEmail?.split('@')[0] || 
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
        // DEFENSIVE: Safe session validation for token refresh
        if (session?.user) {
          const sessionUser = session.user;
          const userId = sessionUser?.id;
          const userEmail = sessionUser?.email;
          
          // DEFENSIVE: Validate session user properties
          if (userId && typeof userId === 'string' && 
              userEmail && typeof userEmail === 'string' && 
              userEmail.includes('@')) {
            const userData = await fetchUserData(userId);
            if (userData) {
              setUser(userData);
            }
          } else {
            console.error('❌ Invalid session user in TOKEN_REFRESHED:', {
              id: userId,
              email: userEmail
            });
          }
        }
      } else if (event === 'INITIAL_SESSION') {
        console.log('🔄 INITIAL_SESSION event - session state:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          email: session?.user?.email
        });
        
        // DEFENSIVE: Handle INITIAL_SESSION safely
        if (session && session.user) {
          console.log('✅ INITIAL_SESSION has valid session, processing...');
          setIsLoading(true);
          try {
            const sessionUser = session.user;
            const userId = sessionUser?.id;
            const userEmail = sessionUser?.email;
            
            // DEFENSIVE: Validate session user properties
            if (userId && typeof userId === 'string' && 
                userEmail && typeof userEmail === 'string' && 
                userEmail.includes('@')) {
              const userData = await fetchUserData(userId);
              if (userData) {
                setUser(userData);
                console.log('✅ User data loaded from INITIAL_SESSION');
              } else {
                console.log('⚠️ No user data found in INITIAL_SESSION, creating fallback');
                const fallbackUser = {
                  id: userId,
                  email: userEmail,
                  name: sessionUser?.user_metadata?.full_name || 
                        sessionUser?.user_metadata?.name || 
                        userEmail?.split('@')[0] || 
                        'User',
                  tokens: 0,
                  subscription_tier: 'free'
                };
                setUser(fallbackUser);
              }
            } else {
              console.log('⚠️ Invalid session user in INITIAL_SESSION, setting to null');
              setUser(null);
            }
          } catch (error) {
            console.error('❌ Error handling INITIAL_SESSION:', error);
            setUser(null);
          } finally {
            setIsLoading(false);
          }
        } else {
          console.log('ℹ️ INITIAL_SESSION has no valid session, setting user to null');
          setUser(null);
          setIsLoading(false);
        }
      }
    });
    
    return () => {
      console.log('🧹 Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, [refreshUser, fetchUserData, isHydrated, isInitialized]);

  const contextValue: AuthContextType = {
    user: user || null, // Ensure user is never undefined
    logout,
    isLoading,
    refreshUser,
  };

  // DEFENSIVE: Wrap provider in error boundary to catch React error #18
  try {
    return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    );
  } catch (error) {
    console.error('❌ AuthProvider render error (React error #18):', error);
    // Return minimal provider to prevent complete crash
    return (
      <AuthContext.Provider value={{
        user: null,
        logout: async () => {},
        isLoading: false,
        refreshUser: async () => {}
      }}>
        {children}
      </AuthContext.Provider>
    );
  }
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
