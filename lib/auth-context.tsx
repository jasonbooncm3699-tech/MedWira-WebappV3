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
  display_name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  forceFetchUserProfile: (userId: string, userEmail: string, userName: string) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // CRITICAL: Create Supabase client instance for cookie-based authentication
  const supabase = createClient();

  // Fetch user data directly from auth.users (Google data) + profiles (tokens/referrals)
  const fetchUserData = useCallback(async (userId: string, userEmail?: string): Promise<User | null> => {
    try {
      console.log('📡 Fetching user data directly from auth.users + profiles...');
      
      // Get Google OAuth data from auth.users
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        console.error('❌ Error fetching auth user:', authError);
        return null;
      }

      // Get tokens and referral data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('token_count, referral_code, referred_by')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('⚠️ Profile data not found, using defaults:', profileError);
      }

      // Extract Google data from auth user metadata
      const googleData = authUser.user.user_metadata || {};
      const displayName = googleData.full_name || googleData.name || '';
      const avatarUrl = googleData.avatar_url || googleData.picture || '';
      
      // Create user data combining both sources
      const userData: User = {
        id: userId,
        email: userEmail || authUser.user.email || '',
        name: displayName ? displayName.split(' ')[0] : '', // Just first name (e.g., "Jason")
        tokens: profileData?.token_count || 30,
        subscription_tier: 'free',
        referral_code: profileData?.referral_code || '',
        referral_count: 0, // Default value
        referred_by: profileData?.referred_by || null,
        display_name: displayName, // Full name (e.g., "Jason Boon")
        avatar_url: avatarUrl // Google profile picture
      };
      
      console.log('✅ User data loaded directly from auth.users + profiles:', {
        tokens: userData.tokens,
        referral_code: userData.referral_code,
        display_name: userData.display_name,
        name: userData.name,
        avatar_url: userData.avatar_url,
        email: userData.email
      });
      
      return userData;
    } catch (error) {
      console.error('❌ Exception fetching user data:', error);
      return null;
    }
  }, [supabase]);

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
      const userData = await fetchUserData(userId, userEmail);
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
  }, [fetchUserData, supabase]);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');
      await supabase.auth.signOut();
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Error logging out:', error);
    }
  }, [supabase]);

  const refreshUserData = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ No user ID available for data refresh');
      return;
    }

    try {
      console.log('🔄 Refreshing user data...');
      const userData = await fetchUserData(user.id, user.email);
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

  // CRITICAL: Force fetch user profile data from user_profiles table
  const forceFetchUserProfile = useCallback(async (userId: string, userEmail: string, userName: string) => {
    console.log('🚀 FORCE FETCHING user profile data for:', userEmail);
    
    let userData = null;
    let retryCount = 0;
    const maxRetries = 10; // Increased retries for critical data fetch
    
    while (!userData && retryCount < maxRetries) {
      // Start with immediate fetch, then wait progressively longer
      if (retryCount > 0) {
        const waitTime = 300 + (retryCount * 200); // 0.3s, 0.5s, 0.7s, 0.9s, etc.
        console.log(`⏳ Force fetching user profile (attempt ${retryCount + 1}/${maxRetries}) - waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.log(`⏳ Force fetching user profile (attempt ${retryCount + 1}/${maxRetries}) - immediate fetch...`);
      }
      
      // Fetch user data from user_profiles table
      userData = await fetchUserData(userId, userEmail);
      
      if (!userData) {
        retryCount++;
        console.log(`⚠️ User profile not found, retrying... (${retryCount}/${maxRetries})`);
      } else {
        console.log('✅ User profile found after force fetch:', {
          tokens: userData.tokens,
          referral_code: userData.referral_code,
          referral_count: userData.referral_count
        });
      }
    }
    
    if (userData) {
      // Combine user_profiles data with auth user data
      const completeUserData: User = {
        ...userData,
        email: userEmail,
        name: userName
      };
      
      console.log('🎉 Force fetch successful - setting user data:', {
        name: completeUserData.name,
        email: completeUserData.email,
        tokens: completeUserData.tokens,
        referral_code: completeUserData.referral_code
      });
      
      setUser(completeUserData);
      return completeUserData;
    } else {
      console.error('❌ Force fetch failed after all retries - attempting manual provisioning...');
      
      // Last resort: try manual provisioning
      try {
        const { data: provisionResult, error: provisionError } = await supabase
          .rpc('provision_user_profile_manually', {
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
            referral_code_param: null
          });
        
        if (provisionResult && provisionResult.success) {
          console.log('✅ Manual provisioning successful during force fetch:', provisionResult);
          
          // Try to fetch the newly created data
          await new Promise(resolve => setTimeout(resolve, 1000));
          const newUserData = await fetchUserData(userId, userEmail);
          
          if (newUserData) {
            const completeUserData: User = {
              ...newUserData,
              email: userEmail,
              name: userName
            };
            setUser(completeUserData);
            return completeUserData;
          }
        } else {
          console.error('❌ Manual provisioning failed during force fetch:', provisionError);
        }
      } catch (provisionError) {
        console.error('❌ Error during manual provisioning:', provisionError);
      }
      
      // Ultimate fallback
      const fallbackUser: User = {
        id: userId,
        email: userEmail,
        name: userName,
        tokens: 30, // Default to 30 tokens
        subscription_tier: 'free',
        referral_code: undefined,
        referral_count: 0,
        referred_by: undefined
      };
      
      console.log('🆘 Using fallback user data:', fallbackUser);
      setUser(fallbackUser);
      return fallbackUser;
    }
  }, [fetchUserData, supabase]);

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
          
          // CRITICAL: Use force fetch to ensure we get user profile data with tokens and referral code
          const userName = sessionUser?.user_metadata?.full_name || 
                          sessionUser?.user_metadata?.name || 
                          userEmail?.split('@')[0] || 
                          'User';
          
          console.log('🚀 Force fetching user profile data after sign-in...');
          const userProfileData = await forceFetchUserProfile(userId, userEmail, userName);
          
          if (userProfileData) {
            console.log('✅ User profile data loaded after sign-in:', {
              tokens: userProfileData.tokens,
              referral_code: userProfileData.referral_code,
              referral_count: userProfileData.referral_count,
              name: userProfileData.name,
              email: userProfileData.email
            });
          } else {
            console.warn('⚠️ No user profile data returned after sign-in');
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
            const userData = await fetchUserData(userId, userEmail);
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
              const userData = await fetchUserData(userId, userEmail);
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
  }, [refreshUser, fetchUserData, forceFetchUserProfile, isHydrated, isInitialized, supabase]);

  // CRITICAL: Auto-refresh user data when user is authenticated but has no tokens or referral code
  useEffect(() => {
    if (isHydrated && user?.id && !isLoading) {
      console.log('🔍 Checking user data completeness...', {
        userId: user.id,
        tokens: user.tokens,
        hasReferralCode: !!user.referral_code,
        referralCount: user.referral_count
      });
      
      // If user is authenticated but has 0 tokens or no referral code, try to refresh
      if (user.tokens === 0 || !user.referral_code) {
        console.log('⚠️ User missing tokens or referral code, attempting refresh...');
        setTimeout(() => {
          refreshUserData();
        }, 1000);
      }
    }
  }, [isHydrated, user?.id, user?.tokens, user?.referral_code, user?.referral_count, isLoading, refreshUserData]);

  // CRITICAL: Force refresh user data on component mount if user is authenticated
  useEffect(() => {
    if (isHydrated && user?.id && !isLoading) {
      console.log('🔄 Force refreshing user data on mount for authenticated user...');
      // Small delay to ensure auth state is fully settled
      setTimeout(() => {
        refreshUserData();
      }, 500);
    }
  }, [isHydrated, user?.id, isLoading, refreshUserData]);

  const contextValue: AuthContextType = {
    user: user || null, // Ensure user is never undefined
    logout,
    isLoading,
    refreshUser,
    refreshUserData,
    forceFetchUserProfile,
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
        refreshUserData: async () => {},
        forceFetchUserProfile: async () => null
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
