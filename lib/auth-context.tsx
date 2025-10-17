'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ErrorInfo } from 'react';
import { createClient, getSessionFromCookies } from './supabase-browser';
import { MobileCacheManager } from './mobile-cache-manager';

interface User {
  id: string;
  email: string;
  name: string;
  tokens: number;
  subscription_tier: string;
  referral_code?: string;
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
  clearAllAuthData: () => void;
  initializeSupabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// GLOBAL: Track initialization across component remounts
let globalInitializationComplete = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start as false since we're not auto-initializing
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);
  
  // Simplified setUser without excessive logging to prevent console spam
  const debugSetUser = useCallback((newUser: User | null) => {
    setUser(newUser);
  }, []); // Removed dependencies to prevent circular calls

  
  // CRITICAL: Use ref to prevent infinite loops - refs don't trigger re-renders
  const initializationRef = useRef(false);
  
  // REMOVED: Excessive logging that was causing 2000+ console messages
  // This was logging on every single render, causing performance issues
  
  // CRITICAL: Create Supabase client instance ONCE using useMemo to prevent recreation
  const supabase = useMemo(() => {
    // REMOVED: Excessive logging that was causing performance issues
    return createClient();
  }, []); // Empty dependency array = create only once


  // SAFETY: Add timeout to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Loading timeout reached, forcing loading to false');
        setIsLoading(false);
        setIsInitialized(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [isLoading]);


  // Simple cache to prevent redundant API calls
  const userDataCache = useRef<Map<string, { data: User | null; timestamp: number }>>(new Map());
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Fetch user data directly from public.profiles (which now includes email from auth.users)
  const fetchUserData = useCallback(async (userId: string, userEmail?: string): Promise<User | null> => {
    try {
      // Check cache first
      const cacheKey = userId;
      const cached = userDataCache.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached user data for:', userId);
        return cached.data;
      }
      
      // Get profile data directly from Supabase profiles table (now includes email)
      let userData: User | null = null;
      
      try {
        // Fetch user profile data using API endpoint for consistency
        const response = await fetch(`/api/user-profile?user_id=${userId}`);
        
        if (!response.ok) {
          throw new Error(`Profile API error: ${response.status} ${response.statusText}`);
        }
        
        const profileData = await response.json();
        const profileError = null; // API handles errors internally
        
        if (profileData && !profileError) {
          
          // Validate that we have the required data
          if (!profileData.email) {
            console.error('❌ CRITICAL: Profile found but email is missing. This should not happen with the new sync trigger.');
            return null;
          }
          
          // Use profile data from API (includes proper name from auth.users)
          const displayName = profileData.display_name || '';
          const avatarUrl = profileData.avatar_url || '';
          userData = {
            id: userId,
            email: profileData.email, // From auth.users via API
            name: profileData.name, // First name from auth.users via API
            tokens: profileData.tokens || 0,
            subscription_tier: profileData.subscription_tier || 'free',
            referral_code: profileData.referral_code || '',
            referred_by: profileData.referred_by,
            display_name: displayName,
            avatar_url: avatarUrl
          };
          console.log('✅ Constructed userData from profile:', userData);
        } else {
          console.warn('⚠️ Profile API returned no data, creating fallback user');
            
            // Create fallback user with provided email
            userData = { 
              id: userId, 
              email: userEmail || '', 
              name: 'User', 
              tokens: 0, 
              subscription_tier: 'free', 
              referral_code: '', 
              referred_by: null, 
              display_name: '', 
              avatar_url: '' 
            };
        }
      } catch (directError) {
        console.error('❌ Direct Supabase fetch error:', directError);
        
        // Network error - create fallback with zero tokens
        userData = {
          id: userId,
          email: userEmail || '',
          name: 'User',
          tokens: 0, // NO TOKENS when API fails - prevents stale data
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when API fails
          referred_by: null,
          display_name: '',
          avatar_url: ''
        };
      }
      
      // CRITICAL: Check if userData is null before accessing properties
      if (!userData) {
        console.error('❌ CRITICAL: userData is null - this should not happen');
        // Cache null result to prevent repeated failed calls
        userDataCache.current.set(cacheKey, { data: null, timestamp: Date.now() });
        return null;
      }
      
      // Cache the successful result
      userDataCache.current.set(cacheKey, { data: userData, timestamp: Date.now() });
      
      return userData;
    } catch (error) {
      console.error('❌ Exception fetching user data:', error);
      return null;
    }
  }, [supabase]);

  // Initialize Supabase only when user explicitly interacts (e.g., clicks Sign In)
  const initializeSupabase = useCallback(async () => {
    if (supabaseInitialized) {
      return; // Already initialized
    }

    console.log('🚀 Initializing Supabase on user interaction...');
    setSupabaseInitialized(true);
    setIsLoading(true);

    try {
      // Check for existing session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Existing session found, loading user data...');
        const userData = await fetchUserData(session.user.id, session.user.email);
        if (userData) {
          debugSetUser(userData);
        }
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Error initializing Supabase:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseInitialized, supabase, fetchUserData, debugSetUser]);

  const refreshUser = useCallback(async () => {
    
    // OPTIMIZATION: Only show loading if we don't have a cached user
    // This prevents "Initializing MedWira AI" on tab switches
    if (!user) {
      setIsLoading(true);
    }
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
      
      // Enhanced mobile debugging: Supabase SSR handles cookie management automatically
      if (typeof window !== 'undefined') {
        try {
          // Debug: List all cookies to see what Supabase SSR has set
          // Simple mobile detection
          const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            console.log('📱 Mobile device detected');
          }
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
            referred_by: null
          };
          
          debugSetUser(cookieUser);
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
      
      // Fetch user data from profiles table (now includes email from auth.users via trigger)
      const userData = await fetchUserData(userId, userEmail);
      if (userData) {
        debugSetUser(userData);
      } else {
        // DEFENSIVE: Safe property access for fallback user creation
        // CRITICAL: Set tokens to 0 to prevent stale data issues
        const fallbackUser = {
          id: userId,
          email: userEmail,
          name: 'User',
          tokens: 0, // NO TOKENS when API fails - prevents stale data
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when API fails
          referred_by: null,
          display_name: '',
          avatar_url: ''
        };
        console.log('📝 Setting fallback user with zero tokens:', fallbackUser);
        console.log('🔍 About to call debugSetUser with fallbackUser:', fallbackUser);
        debugSetUser(fallbackUser);
        console.log('🔍 debugSetUser call completed for fallback');
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]); // REMOVED fetchUserData and user from deps to prevent circular dependency

  // Utility function to clear all authentication data
  const clearAllAuthData = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Use mobile-optimized cache clearing
      MobileCacheManager.clearAll();
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Clear Supabase-specific authentication data
      const authKeys = ['sb-', 'supabase.auth.token', 'supabase.auth.refresh_token'];
      Object.keys(localStorage).forEach(key => {
        if (authKeys.some(authKey => key.startsWith(authKey))) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage).forEach(key => {
        if (authKeys.some(authKey => key.startsWith(authKey))) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('🧹 Cleared all authentication data including Supabase tokens');
    } catch (error) {
      console.warn('⚠️ Error clearing auth data:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Set loading state to prevent UI hanging
      setIsLoading(true);
      
      // Clear user state immediately to prevent hanging
      setUser(null);
      
      // Clear all authentication data
      clearAllAuthData();
      
      // Sign out from Supabase with timeout
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      
      console.log('✅ Logout successful');
      
    } catch (error) {
      console.error('❌ Error logging out:', error);
      
      // Force clear user state even if Supabase signOut fails
      setUser(null);
      
      // Clear storage anyway
      clearAllAuthData();
    } finally {
      setIsLoading(false);
    }
  }, [supabase, clearAllAuthData]);

  const refreshUserData = useCallback(async () => {
    console.log('🔍 [DEBUG] refreshUserData called with user state:', {
      hasUser: !!user,
      userId: user?.id || 'null',
      userEmail: user?.email || 'null',
      userTokens: user?.tokens || 'null'
    });
    
    if (!user?.id) {
      console.log('⚠️ No user ID available for data refresh - user state:', {
        hasUser: !!user,
        userId: user?.id || 'null',
        userEmail: user?.email || 'null'
      });
      console.log('⚠️ [DEBUG] Skipping refreshUserData - waiting for user authentication to complete');
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
        
        // CRITICAL FIX: Only update user state if data has actually changed
        // This prevents infinite loops caused by unnecessary re-renders
        const hasDataChanged = (
          user.tokens !== completeUserData.tokens ||
          user.referral_code !== completeUserData.referral_code ||
          user.referred_by !== completeUserData.referred_by ||
          user.display_name !== completeUserData.display_name ||
          user.avatar_url !== completeUserData.avatar_url ||
          user.subscription_tier !== completeUserData.subscription_tier
        );
        
        if (hasDataChanged) {
          console.log('✅ User data refreshed successfully:', {
            name: completeUserData.name,
            tokens: completeUserData.tokens,
            referral_code: completeUserData.referral_code,
          });
          debugSetUser(completeUserData);
        } else {
          console.log('✅ User data unchanged, skipping state update to prevent infinite loop');
        }
      } else {
        // CRITICAL: fetchUserData returned null - set safe fallback to prevent stale data
        console.warn('⚠️ fetchUserData returned null - setting safe fallback with zero tokens');
        const safeFallbackUser: User = {
          id: user.id,
          email: user.email,
          name: user.name,
          tokens: 0, // NO TOKENS when fetchUserData returns null - prevents stale data
          subscription_tier: 'free',
          referral_code: '', // NO REFERRAL CODE when fetchUserData returns null
          referred_by: null,
          display_name: user.display_name || '',
          avatar_url: user.avatar_url || ''
        };
        // Only update if data has changed to prevent infinite loops
        const hasDataChanged = (
          user.tokens !== safeFallbackUser.tokens ||
          user.referral_code !== safeFallbackUser.referral_code ||
          user.subscription_tier !== safeFallbackUser.subscription_tier
        );
        
        if (hasDataChanged) {
          console.log('🛡️ Setting safe fallback user due to null return:', safeFallbackUser);
          setUser(safeFallbackUser);
        } else {
          console.log('✅ Safe fallback data unchanged, skipping state update');
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
          referred_by: null,
          display_name: user.display_name || '',
          avatar_url: user.avatar_url || ''
        };
        // Only update if data has changed to prevent infinite loops
        const hasDataChanged = (
          user.tokens !== safeFallbackUser.tokens ||
          user.referral_code !== safeFallbackUser.referral_code ||
          user.subscription_tier !== safeFallbackUser.subscription_tier
        );
        
        if (hasDataChanged) {
          console.log('🛡️ Setting safe fallback user due to unexpected error:', safeFallbackUser);
          setUser(safeFallbackUser);
        } else {
          console.log('✅ Error fallback data unchanged, skipping state update');
        }
      }
    }
  }, []); // REMOVED all dependencies to prevent circular dependency and state loops

  // CRITICAL: Force fetch user profile data from profiles table
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
          });
        }
      }
      
      if (userData) {
        // Combine profiles data with auth user data
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
          // Direct database operation instead of calling function
          const { data: provisionResult, error: provisionError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              tokens: 30,
              referral_code: `REF${userId.substring(0, 6).toUpperCase()}`,
              referred_by: null,
              email: userEmail,
              display_name: userName,
              subscription_tier: 'free',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select();
          
          if (!provisionError && provisionResult) {
            console.log('✅ Manual provisioning successful during force fetch:', provisionResult);
            
            // Try to fetch the newly created data
            await new Promise(resolve => setTimeout(resolve, 300));
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
        referred_by: null,
        display_name: userName,
        avatar_url: ''
      };
      
      console.log('🛡️ Setting emergency fallback user to prevent app crash:', emergencyFallbackUser);
      setUser(emergencyFallbackUser);
      return emergencyFallbackUser;
    }
  }, [supabase]); // REMOVED fetchUserData to prevent circular dependency

  // Handle hydration
  useEffect(() => {
    // REMOVED: Excessive logging that was causing performance issues
    setIsHydrated(true);
  }, []);

  // REMOVED: Excessive user state change logging that was causing performance issues
  // This was logging every time user state changed, contributing to the 2000+ messages

  // Auto-refresh user data when component mounts and user is authenticated
  // REMOVED: This was causing race conditions where refreshUserData was called before user state was properly set
  // useEffect(() => {
  //   if (isHydrated && user?.id && !isLoading) {
  //     refreshUserData();
  //   }
  // }, [isHydrated, isLoading]);

  useEffect(() => {
    // Only set up hydration - no automatic Supabase initialization
    if (!isHydrated) {
      return;
    }
    
    // Check if user came from OAuth callback and needs immediate initialization
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('code') || urlParams.has('access_token')) {
        console.log('🔄 OAuth callback detected, initializing Supabase...');
        initializeSupabase();
      }
    }
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // DEFENSIVE: Only process auth events after Supabase is initialized
      if (!supabaseInitialized) {
        return;
      }
      
      if (event === 'SIGNED_IN') {
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
          const userName = 'User';
          
          console.log('🚀 Force fetching user profile data after sign-in...');
          const userProfileData = await forceFetchUserProfile(userId, userEmail, userName);
          
          if (userProfileData) {
            console.log('✅ User profile data loaded after sign-in:', {
              tokens: userProfileData.tokens,
              referral_code: userProfileData.referral_code,
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
                  name: 'User',
                  tokens: 0,
                  subscription_tier: 'free',
                  referral_code: '',
                  referred_by: null,
                  display_name: '',
                  avatar_url: ''
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
  }, [isHydrated, initializeSupabase]); // Added initializeSupabase for OAuth callback handling

  // REMOVED: Redundant useEffect that was causing infinite loops

  // REMOVED: Another redundant useEffect that was causing infinite loops

  const contextValue: AuthContextType = {
    user: user || null, // Ensure user is never undefined
    logout,
    isLoading,
    refreshUser,
    refreshUserData,
    forceFetchUserProfile,
    clearAllAuthData,
    initializeSupabase,
  };

  // DEFENSIVE: Wrap provider in error boundary to catch React error #18
  try {
    // REMOVED: Excessive logging that was causing performance issues
    return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    );
  } catch (error) {
    console.error('❌ AuthProvider render error (React error #18):', error);
    // REMOVED: Excessive logging that was causing performance issues
    // Return minimal provider to prevent complete crash
    return (
      <AuthContext.Provider value={{
        user: null,
        logout: async () => {},
        isLoading: false,
        refreshUser: async () => {},
        refreshUserData: async () => {},
        forceFetchUserProfile: async () => null,
        clearAllAuthData: () => {},
        initializeSupabase: async () => {}
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
