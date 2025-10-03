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
  referred_by?: string | null;
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

      // Get profile data via API endpoint with enhanced error handling
      let userData: User | null = null;
      
      try {
        const profileResponse = await fetch(`/api/user-profile?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (profileResponse.ok) {
          // CRITICAL: Safe JSON parsing with error handling
          let profileApiData;
          try {
            profileApiData = await profileResponse.json();
            console.log('✅ Profile data retrieved via API:', profileApiData);
          } catch (jsonError) {
            console.error('❌ CRITICAL: Failed to parse API response JSON:', jsonError);
            // Create safe fallback when JSON parsing fails
            const googleData = authUser.user.user_metadata || {};
            const displayName = googleData.full_name || googleData.name || '';
            const avatarUrl = googleData.avatar_url || googleData.picture || '';
            
            userData = {
              id: userId,
              email: userEmail || authUser.user.email || '',
              name: displayName ? displayName.split(' ')[0] : '',
              tokens: 0, // NO TOKENS when JSON parsing fails
              subscription_tier: 'free',
              referral_code: '', // NO REFERRAL CODE when JSON parsing fails
              referral_count: 0,
              referred_by: null,
              display_name: displayName,
              avatar_url: avatarUrl
            };
          }
          
          // CRITICAL: Validate that the API response has required fields
          if (profileApiData && typeof profileApiData === 'object' && 
              typeof profileApiData.tokens === 'number' && 
              typeof profileApiData.id === 'string') {
            userData = profileApiData;
          } else if (profileApiData) {
            console.error('❌ CRITICAL: Invalid API response format:', profileApiData);
            // Create safe fallback when API returns invalid data
            const googleData = authUser.user.user_metadata || {};
            const displayName = googleData.full_name || googleData.name || '';
            const avatarUrl = googleData.avatar_url || googleData.picture || '';
            
            userData = {
              id: userId,
              email: userEmail || authUser.user.email || '',
              name: displayName ? displayName.split(' ')[0] : '',
              tokens: 0, // NO TOKENS when API returns invalid data
              subscription_tier: 'free',
              referral_code: '', // NO REFERRAL CODE when API returns invalid data
              referral_count: 0,
              referred_by: null,
              display_name: displayName,
              avatar_url: avatarUrl
            };
          }
        } else {
          const errorData = await profileResponse.json().catch(() => ({}));
          console.warn('⚠️ Profile API failed:', {
            status: profileResponse.status,
            error: errorData.error,
            apiStatus: errorData.status
          });
          
          // Check error type and handle accordingly
          if (profileResponse.status === 403 || profileResponse.status === 401) {
            console.error('❌ Authentication/Authorization error - cannot access user data');
            // Return null to indicate authentication failure
            return null;
          }
          
          if (profileResponse.status === 404) {
            console.warn('⚠️ User profile not found - user may not be provisioned yet');
            // Return null to indicate profile not found
            return null;
          }
          
          // For other errors (500, network issues), create fallback with zero tokens
          console.error('❌ Server error or network issue - creating fallback with no tokens');
          const googleData = authUser.user.user_metadata || {};
          const displayName = googleData.full_name || googleData.name || '';
          const avatarUrl = googleData.avatar_url || googleData.picture || '';
          
          userData = {
            id: userId,
            email: userEmail || authUser.user.email || '',
            name: displayName ? displayName.split(' ')[0] : '',
            tokens: 0, // NO TOKENS when API fails - prevents stale data
            subscription_tier: 'free',
            referral_code: '', // NO REFERRAL CODE when API fails
            referral_count: 0,
            referred_by: null,
            display_name: displayName,
            avatar_url: avatarUrl
          };
        }
      } catch (apiError) {
        console.error('❌ Profile API network error:', apiError);
        
        // Network error - create fallback with zero tokens
        const googleData = authUser.user.user_metadata || {};
        const displayName = googleData.full_name || googleData.name || '';
        const avatarUrl = googleData.avatar_url || googleData.picture || '';
        
        userData = {
          id: userId,
          email: userEmail || authUser.user.email || '',
          name: displayName ? displayName.split(' ')[0] : '',
          tokens: 0, // NO TOKENS when API fails - prevents stale data
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when API fails
          referral_count: 0,
          referred_by: null,
          display_name: displayName,
          avatar_url: avatarUrl
        };
      }
      
      // CRITICAL: Check if userData is null before accessing properties
      if (!userData) {
        console.error('❌ CRITICAL: userData is null - this should not happen');
        return null;
      }
      
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
            referred_by: null
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
        console.log('⚠️ No user data in database, creating fallback user with zero tokens');
        // DEFENSIVE: Safe property access for fallback user creation
        // CRITICAL: Set tokens to 0 to prevent stale data issues
        const fallbackUser = {
          id: userId,
          email: userEmail,
          name: sessionUser?.user_metadata?.full_name || 
                sessionUser?.user_metadata?.name || 
                userEmail?.split('@')[0] || 
                'User',
          tokens: 0, // NO TOKENS when API fails - prevents stale data
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when API fails
          referral_count: 0,
          referred_by: null,
          display_name: sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name || '',
          avatar_url: sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.picture || ''
        };
        console.log('📝 Setting fallback user with zero tokens:', fallbackUser);
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
      
      // CRITICAL: Wrap fetchUserData in try-catch to prevent app crashes
      let userData = null;
      try {
        userData = await fetchUserData(user.id, user.email);
      } catch (fetchError) {
        console.error('❌ CRITICAL: fetchUserData threw unhandled exception:', fetchError);
        // Set safe fallback user state to prevent app crash
        const safeFallbackUser: User = {
          id: user.id,
          email: user.email,
          name: user.name,
          tokens: 0, // NO TOKENS when fetch fails - prevents stale data
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when fetch fails
          referral_count: 0,
          referred_by: null,
          display_name: user.display_name || '',
          avatar_url: user.avatar_url || ''
        };
        console.log('🛡️ Setting safe fallback user to prevent app crash:', safeFallbackUser);
        setUser(safeFallbackUser);
        return; // Exit early to prevent further processing
      }

      if (userData) {
        // Combine with existing user data to preserve email and name
        const completeUserData: User = {
          ...userData,
          email: user.email, // Preserve existing email
          name: user.name    // Preserve existing name
        };
        
        console.log('✅ User data refreshed successfully:', {
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
            // Set safe fallback when provision fails
            const safeFallbackUser: User = {
              id: user.id,
              email: user.email,
              name: user.name,
              tokens: 0, // NO TOKENS when provision fails
              subscription_tier: 'free',
              referral_code: '', // NO REFERRAL CODE when provision fails
              referral_count: 0,
              referred_by: null,
              display_name: user.display_name || '',
              avatar_url: user.avatar_url || ''
            };
            setUser(safeFallbackUser);
          }
        } catch (provisionError) {
          console.error('❌ Error provisioning user during refresh:', provisionError);
          // Set safe fallback when provision throws exception
          const safeFallbackUser: User = {
            id: user.id,
            email: user.email,
            name: user.name,
            tokens: 0, // NO TOKENS when provision fails
            subscription_tier: 'free',
            referral_code: '', // NO REFERRAL CODE when provision fails
            referral_count: 0,
            referred_by: null,
            display_name: user.display_name || '',
            avatar_url: user.avatar_url || ''
          };
          setUser(safeFallbackUser);
        }
      }
    } catch (error) {
      console.error('❌ CRITICAL: Unexpected error in refreshUserData:', error);
      // CRITICAL: Set safe fallback to prevent app crash
      if (user?.id) {
        const safeFallbackUser: User = {
          id: user.id,
          email: user.email,
          name: user.name,
          tokens: 0, // NO TOKENS when unexpected error occurs
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when unexpected error occurs
          referral_count: 0,
          referred_by: null,
          display_name: user.display_name || '',
          avatar_url: user.avatar_url || ''
        };
        console.log('🛡️ Setting safe fallback user due to unexpected error:', safeFallbackUser);
        setUser(safeFallbackUser);
      }
    }
  }, [user?.id, user?.email, user?.name, user?.display_name, user?.avatar_url, fetchUserData, supabase]);

  // CRITICAL: Force fetch user profile data from user_profiles table
  const forceFetchUserProfile = useCallback(async (userId: string, userEmail: string, userName: string) => {
    console.log('🚀 FORCE FETCHING user profile data for:', userEmail);
    
    let userData = null;
    let retryCount = 0;
    const maxRetries = 10; // Increased retries for critical data fetch
    
    try {
      while (!userData && retryCount < maxRetries) {
        // Start with immediate fetch, then wait progressively longer
        if (retryCount > 0) {
          const waitTime = 300 + (retryCount * 200); // 0.3s, 0.5s, 0.7s, 0.9s, etc.
          console.log(`⏳ Force fetching user profile (attempt ${retryCount + 1}/${maxRetries}) - waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.log(`⏳ Force fetching user profile (attempt ${retryCount + 1}/${maxRetries}) - immediate fetch...`);
        }
        
        // CRITICAL: Wrap fetchUserData in try-catch to prevent crashes
        try {
          userData = await fetchUserData(userId, userEmail);
        } catch (fetchError) {
          console.error(`❌ CRITICAL: fetchUserData threw exception on attempt ${retryCount + 1}:`, fetchError);
          retryCount++;
          continue; // Continue to next retry attempt
        }
        
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
        
        // CRITICAL: Ultimate fallback with ZERO tokens to prevent stale data
        const fallbackUser: User = {
          id: userId,
          email: userEmail,
          name: userName,
          tokens: 0, // NO TOKENS when all attempts fail - prevents stale data
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when all attempts fail
          referral_count: 0,
          referred_by: null,
          display_name: userName,
          avatar_url: ''
        };
        
        console.log('🆘 Using safe fallback user data with zero tokens:', fallbackUser);
        setUser(fallbackUser);
        return fallbackUser;
      }
    } catch (error) {
      console.error('❌ CRITICAL: Unexpected error in forceFetchUserProfile:', error);
      
      // CRITICAL: Emergency fallback to prevent app crash
      const emergencyFallbackUser: User = {
        id: userId,
        email: userEmail,
        name: userName,
        tokens: 0, // NO TOKENS when unexpected error occurs
        subscription_tier: 'free',
        referral_code: '', // NO REFERRAL CODE when unexpected error occurs
        referral_count: 0,
        referred_by: null,
        display_name: userName,
        avatar_url: ''
      };
      
      console.log('🛡️ Setting emergency fallback user to prevent app crash:', emergencyFallbackUser);
      setUser(emergencyFallbackUser);
      return emergencyFallbackUser;
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
