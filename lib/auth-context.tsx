'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ErrorInfo } from 'react';
import { createClient, getSessionFromCookies } from './supabase-browser';

interface User {
  id: string;
  email: string;
  name: string;
  tokens: number;
  subscription_tier: string;
  referral_code?: string;
  referral_count?: number;
  referred_by?: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // CRITICAL: Create Supabase client instance for cookie-based authentication
  const supabase = createClient();

  // Fetch user data from Supabase user_profiles table
  const fetchUserData = useCallback(async (userId: string): Promise<User | null> => {
    try {
      console.log('📡 Fetching user data from user_profiles table...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user data:', error);
        return null;
      }

      if (data) {
        // Map user_profiles data to User interface
        const userData: User = {
          id: data.id,
          email: '', // Will be fetched from auth.users if needed
          name: '', // Will be fetched from auth.users if needed
          tokens: data.token_count || 0,
          subscription_tier: 'free', // Default tier
          referral_code: data.referral_code,
          referral_count: data.referral_count || 0,
          referred_by: data.referred_by
        };
        
        console.log('✅ User data loaded from user_profiles:', {
          tokens: userData.tokens,
          referral_code: userData.referral_code,
          referral_count: userData.referral_count,
          referred_by: userData.referred_by
        });
        
        return userData;
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
      
      // Simplified debugging: Supabase SSR handles cookie management automatically
      if (typeof window !== 'undefined') {
        try {
          // Debug: List all cookies to see what Supabase SSR has set
          console.log('🔍 All cookies:', document.cookie);
          console.log('🔍 Cookie keys:', document.cookie.split(';').map(c => c.trim().split('=')[0]));
        } catch (e) {
          console.log('⚠️ Error reading cookies:', e);
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
        // Cookie debugging - Supabase SSR manages cookies automatically
        cookieCount: typeof window !== 'undefined' ? document.cookie.split(';').filter(c => c.trim()).length : 0,
        hasCookies: typeof window !== 'undefined' ? document.cookie.length > 0 : false
      });
      
      // CRITICAL: If no session from Supabase, try to get it from cookies
      if (!sessionData && typeof window !== 'undefined') {
        console.log('🔄 No session from Supabase, checking cookies...');
        const cookieSession = getSessionFromCookies();
        
        if (cookieSession && cookieSession.user) {
          console.log('✅ Found session in cookies, using fallback method');
          
          // Set the user from cookie session
          const cookieUser: User = {
            id: cookieSession.user.id,
            email: cookieSession.user.email || '',
            name: cookieSession.user.user_metadata?.full_name || 
                  cookieSession.user.user_metadata?.name || 
                  cookieSession.user.email?.split('@')[0] || 
                  'User',
            tokens: 30, // Default tokens for new users
            subscription_tier: 'free', // Default subscription tier
            referral_code: undefined, // Will be fetched from database
            referral_count: 0,
            referred_by: undefined
          };
          
          setUser(cookieUser);
          setIsLoading(false);
          return;
        }
      }
      
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

  const refreshUserData = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ No user ID available for data refresh');
      return;
    }

    try {
      console.log('🔄 Refreshing user data...');
      const userData = await fetchUserData(user.id);
      if (userData) {
        // Combine with existing user data to preserve email and name
        const completeUserData: User = {
          ...userData,
          email: user.email, // Preserve existing email
          name: user.name    // Preserve existing name
        };
        
        console.log('✅ User data refreshed:', {
          name: completeUserData.name,
          tokens: completeUserData.tokens,
          referral_code: completeUserData.referral_code,
          referral_count: completeUserData.referral_count
        });
        setUser(completeUserData);
      } else {
        console.log('⚠️ No user data found during refresh - user may not be provisioned yet');
        
        // If no user data found, try to provision the user
        try {
          console.log('🔄 Attempting to provision user during refresh...');
          const { data: provisionResult, error: provisionError } = await supabase
            .rpc('provision_user_profile_manually', {
              user_id: user.id,
              user_email: user.email,
              user_name: user.name,
              referral_code_param: null
            });
          
          if (provisionResult && provisionResult.success) {
            console.log('✅ User provisioned during refresh:', provisionResult);
            // Recursively call refreshUserData to fetch the newly created data
            setTimeout(() => refreshUserData(), 500);
          } else {
            console.error('❌ Failed to provision user during refresh:', provisionError);
          }
        } catch (provisionError) {
          console.error('❌ Error provisioning user during refresh:', provisionError);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  }, [user?.id, user?.email, user?.name, fetchUserData, supabase]);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auto-refresh user data when component mounts and user is authenticated
  useEffect(() => {
    if (isHydrated && user?.id && !isLoading) {
      console.log('🔄 Auto-refreshing user data on mount...');
      refreshUserData();
    }
  }, [isHydrated, user?.id, isLoading, refreshUserData]);

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
          
          // Wait for database to be updated (auth callback should have run)
          // Increased wait time and added retry logic for user_profiles creation
          let userData = null;
          let retryCount = 0;
          const maxRetries = 5;
          
          while (!userData && retryCount < maxRetries) {
            // Wait progressively longer on each retry
            const waitTime = 1000 + (retryCount * 500);
            console.log(`⏳ Waiting ${waitTime}ms for user_profiles to be created (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Fetch user data from user_profiles table
            userData = await fetchUserData(userId);
            
            if (!userData) {
              retryCount++;
              console.log(`⚠️ User data not found, retrying... (${retryCount}/${maxRetries})`);
            } else {
              console.log('✅ User data found after retry:', retryCount);
            }
          }
          if (userData) {
            // Combine user_profiles data with auth user data
            const completeUserData: User = {
              ...userData,
              email: userEmail,
              name: sessionUser?.user_metadata?.full_name || 
                    sessionUser?.user_metadata?.name || 
                    userEmail?.split('@')[0] || 
                    'User'
            };
            
            console.log('✅ User data loaded after sign-in:', {
              name: completeUserData.name,
              email: completeUserData.email,
              tokens: completeUserData.tokens,
              tier: completeUserData.subscription_tier,
              referral_code: completeUserData.referral_code,
              referral_count: completeUserData.referral_count,
              referred_by: completeUserData.referred_by
            });
            setUser(completeUserData);
          } else {
            console.log('⚠️ No user data found after all retries, attempting manual provisioning...');
            
            try {
              // Try to manually provision the user as a last resort
              const { data: provisionResult, error: provisionError } = await supabase
                .rpc('provision_user_profile_manually', {
                  user_id: userId,
                  user_email: userEmail,
                  user_name: sessionUser?.user_metadata?.full_name || 
                            sessionUser?.user_metadata?.name || 
                            userEmail?.split('@')[0] || 
                            'User',
                  referral_code_param: null
                });
              
              if (provisionResult && provisionResult.success) {
                console.log('✅ Manual provisioning successful:', provisionResult);
                
                // Try to fetch the user data again after provisioning
                const newUserData = await fetchUserData(userId);
                if (newUserData) {
                  const completeUserData: User = {
                    ...newUserData,
                    email: userEmail,
                    name: sessionUser?.user_metadata?.full_name || 
                          sessionUser?.user_metadata?.name || 
                          userEmail?.split('@')[0] || 
                          'User'
                  };
                  console.log('✅ User data loaded after manual provisioning:', completeUserData);
                  setUser(completeUserData);
                } else {
                  throw new Error('Failed to fetch user data after provisioning');
                }
              } else {
                throw new Error(provisionError?.message || 'Manual provisioning failed');
              }
            } catch (provisionError) {
              console.error('❌ Manual provisioning failed:', provisionError);
              
              // Create fallback user with default values
              const fallbackUser = {
                id: userId,
                email: userEmail,
                name: sessionUser?.user_metadata?.full_name || 
                      sessionUser?.user_metadata?.name || 
                      userEmail?.split('@')[0] || 
                      'User',
                tokens: 30, // Default to 30 tokens for new users
                subscription_tier: 'free',
                referral_code: undefined,
                referral_count: 0,
                referred_by: undefined
              };
              console.log('📝 Setting fallback user after failed provisioning:', fallbackUser);
              setUser(fallbackUser);
            }
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
    refreshUserData,
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
        refreshUser: async () => {},
        refreshUserData: async () => {}
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
