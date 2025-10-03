/**
 * Enhanced user data fetching utilities
 * Handles API calls with proper error handling and fallbacks
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  tokens: number;
  referral_code?: string;
  referral_count?: number;
  referred_by?: string | null;
  display_name?: string;
  avatar_url?: string;
  subscription_tier: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: string;
  httpStatus?: number;
}

/**
 * Fetch user profile from API with robust error handling
 */
export async function fetchUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
  try {
    console.log('🔍 Fetching user profile for:', userId);
    
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        status: 'MISSING_USER_ID',
        httpStatus: 400
      };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return {
        success: false,
        error: 'Invalid user ID format',
        status: 'INVALID_USER_ID',
        httpStatus: 400
      };
    }

    const response = await fetch(`/api/user-profile?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ User profile fetched successfully:', {
        tokens: data.tokens,
        referral_code: data.referral_code,
        hasDisplayName: !!data.display_name
      });
      
      return {
        success: true,
        data: data as UserProfile,
        httpStatus: response.status
      };
    } else {
      console.error('❌ API error response:', {
        status: response.status,
        error: data.error,
        apiStatus: data.status
      });
      
      return {
        success: false,
        error: data.error || 'Unknown API error',
        status: data.status || 'API_ERROR',
        httpStatus: response.status
      };
    }

  } catch (error) {
    console.error('❌ Fetch user profile error:', error);
    
    let errorMessage = 'Failed to fetch user profile';
    let status = 'NETWORK_ERROR';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - server took too long to respond';
        status = 'TIMEOUT_ERROR';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error - unable to connect to server';
        status = 'NETWORK_ERROR';
      } else {
        errorMessage = error.message;
        status = 'UNKNOWN_ERROR';
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      status: status,
      httpStatus: 0
    };
  }
}

/**
 * Create a fallback user profile when API fails
 */
export function createFallbackUserProfile(userId: string, email?: string): UserProfile {
  console.log('⚠️ Creating fallback user profile for:', userId);
  
  return {
    id: userId,
    email: email || '',
    name: email ? email.split('@')[0] : 'User',
    tokens: 0, // No tokens when API fails
    subscription_tier: 'free',
    referral_code: '', // Empty when API fails
    referral_count: 0,
    referred_by: null,
    display_name: email ? email.split('@')[0] : '',
    avatar_url: ''
  };
}

/**
 * Check if error is due to authentication/authorization issues
 */
export function isAuthError(status: string | undefined, httpStatus?: number): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  if (status === 'RLS_ACCESS_DENIED' || status === 'PROFILE_NOT_FOUND') return true;
  return false;
}

/**
 * Check if error is due to network/server issues
 */
export function isNetworkError(status: string | undefined, httpStatus?: number): boolean {
  if (httpStatus === 503 || httpStatus === 0) return true;
  if (status === 'NETWORK_ERROR' || status === 'TIMEOUT_ERROR') return true;
  return false;
}
