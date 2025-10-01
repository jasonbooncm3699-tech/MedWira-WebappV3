'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SocialAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
}

export default function SocialAuthModal({ isOpen, onClose, mode }: SocialAuthModalProps) {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authStartTimeRef = useRef<number | null>(null);

  // Monitor auth state changes to detect cancellation
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'No session');

      // If we were loading and user comes back without a session, they likely cancelled
      if (socialLoading && !session && event === 'SIGNED_OUT') {
        const timeSinceStart = authStartTimeRef.current 
          ? Date.now() - authStartTimeRef.current 
          : 0;

        // If less than 30 seconds passed, it's likely a cancellation (not a timeout)
        if (timeSinceStart < 30000) {
          console.log('⚠️ OAuth likely cancelled by user');
          setErrorMessage('Login cancelled. Please try again or use another method.');
          setSocialLoading(null);
        }
      }

      // If successfully signed in, close modal
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in successfully');
        setSocialLoading(null);
        setErrorMessage('');
        onClose();
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [socialLoading, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSocialLoading(null);
      setErrorMessage('');
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      authStartTimeRef.current = null;
    }
  }, [isOpen]);

  // Handle visibility change (user switching tabs/windows)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && socialLoading) {
        console.log('👁️ Page became visible, checking auth status...');
        
        // Check if user has a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // User came back without completing OAuth
          const timeSinceStart = authStartTimeRef.current 
            ? Date.now() - authStartTimeRef.current 
            : 0;

          if (timeSinceStart > 1000) { // Give at least 1 second
            console.log('⚠️ User returned without session - likely cancelled');
            setErrorMessage('Login cancelled. Please try again or use another method.');
            setSocialLoading(null);
            authStartTimeRef.current = null;
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socialLoading]);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      // Reset any previous error messages
      setErrorMessage('');
      setSocialLoading(provider);
      authStartTimeRef.current = Date.now();
      
      console.log(`🔐 Starting ${provider} OAuth flow...`);

      // Set a timeout to reset loading state if OAuth takes too long
      // This handles cases where the redirect doesn't happen
      authTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ OAuth timeout - resetting state');
        setErrorMessage('Authentication timeout. Please try again.');
        setSocialLoading(null);
        authStartTimeRef.current = null;
      }, 60000); // 60 second timeout

      // Configure redirect URL for OAuth
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error(`❌ ${provider} OAuth error:`, error.message);
        setErrorMessage(`${provider} login failed: ${error.message}`);
        setSocialLoading(null);
        authStartTimeRef.current = null;
        
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        return;
      }

      console.log(`✅ ${provider} OAuth initiated successfully`);
      // Browser will redirect to OAuth provider
      // If redirect doesn't happen, timeout will handle it
      
    } catch (error) {
      console.error(`💥 ${provider} OAuth exception:`, error);
      setErrorMessage(`${provider} login failed. Please try again.`);
      setSocialLoading(null);
      authStartTimeRef.current = null;
      
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    }
  };

  // Handle OAuth callback and session refresh
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check if this is a session refresh after OAuth callback
      const sessionRefresh = urlParams.get('session_refresh');
      if (sessionRefresh === 'true') {
        console.log('🔄 Session refresh detected, checking auth state...');
        
        // Give Supabase more time to set cookies and process session
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error after OAuth:', sessionError);
          setErrorMessage('Session error. Please try logging in again.');
          setSocialLoading(null);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Session confirmed after OAuth:', {
            userId: session.user.id,
            email: session.user.email,
            provider: session.user.app_metadata?.provider
          });
          
          // Close modal and let auth-context handle user state
          setSocialLoading(null);
          setErrorMessage('');
          onClose();
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          console.warn('⚠️ No session found after OAuth redirect');
          setErrorMessage('Authentication failed. Please try again.');
          setSocialLoading(null);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      
      // Check for both old and new error parameter names
      const hashError = hashParams.get('error') || hashParams.get('auth_error');
      const hashErrorDescription = hashParams.get('error_description') || hashParams.get('auth_error_description');
      const urlError = urlParams.get('error') || urlParams.get('auth_error');
      const urlErrorDescription = urlParams.get('error_description') || urlParams.get('auth_error_description');
      
      const error = hashError || urlError;
      const errorDescription = hashErrorDescription || urlErrorDescription;
      
      if (error) {
        console.error('❌ OAuth callback error:', {
          error,
          description: errorDescription,
          timestamp: new Date().toISOString()
        });
        
        // User-friendly error messages
        let friendlyMessage = 'Authentication failed. Please try again.';
        
        if (error === 'access_denied') {
          friendlyMessage = 'Login cancelled. You can try again or use another method.';
        } else if (error === 'exchange_failed') {
          friendlyMessage = 'Authentication failed. Please check your internet connection and try again.';
        } else if (error === 'no_code') {
          friendlyMessage = 'OAuth code missing. Please try again.';
        } else if (error === 'callback_exception') {
          friendlyMessage = 'An error occurred during login. Please try again.';
        } else if (errorDescription) {
          friendlyMessage = `Authentication failed: ${errorDescription}`;
        }
        
        setErrorMessage(friendlyMessage);
        setSocialLoading(null);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Check if we're on the auth callback page
      if (window.location.pathname === '/auth/callback') {
        try {
          const { data, error: callbackError } = await supabase.auth.getSession();
          
          if (callbackError) {
            console.error('❌ Session error after OAuth:', callbackError.message);
            setErrorMessage('Session error. Please try logging in again.');
            return;
          }

          if (data.session?.user) {
            console.log('✅ OAuth authentication successful for:', data.session.user.email);
            
            // Create user record if this is a new user
            if (data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name) {
              try {
                const userName = data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || 'User';
                await supabase.from('users').upsert({
                  id: data.session.user.id,
                  email: data.session.user.email,
                  name: userName,
                  tokens: 30,
                  subscription_tier: 'free',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  last_login: new Date().toISOString(),
                });
                console.log('✅ User record created/updated');
              } catch (dbError) {
                console.warn('⚠️ Failed to create user record:', dbError);
              }
            }
            
            // Redirect back to home page
            window.location.href = '/';
          }
        } catch (error) {
          console.error('💥 OAuth callback error:', error);
          setErrorMessage('An error occurred. Please try again.');
        }
      }
    };

    handleAuthCallback();
  }, [onClose]);

  if (!isOpen) return null;

  const modalTitle = mode === 'login' ? 'Sign In to MedWira' : 'Sign Up for MedWira';
  const modalDescription = mode === 'login' 
    ? 'Sign in with your social account to continue' 
    : 'Create an account using your social login';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px' 
        }}>
          <div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#ffffff',
              margin: 0,
              marginBottom: '8px'
            }}>
              {modalTitle}
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#888', 
              margin: 0 
            }}>
              {modalDescription}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={socialLoading !== null}
            style={{
              background: 'none',
              border: 'none',
              color: socialLoading !== null ? '#555' : '#888',
              cursor: socialLoading !== null ? 'not-allowed' : 'pointer',
              padding: '8px',
              borderRadius: '4px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (socialLoading === null) {
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (socialLoading === null) {
                e.currentTarget.style.color = '#888';
              }
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message - Show at top for better visibility */}
        {errorMessage && (
          <div style={{ 
            marginBottom: '24px',
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '14px',
            background: 'rgba(255, 152, 0, 0.1)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            color: '#ffa726',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Social Login Buttons */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          marginBottom: '24px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={socialLoading !== null}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '500',
              cursor: socialLoading !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              opacity: socialLoading !== null ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (socialLoading === null) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = '#00d4ff';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {socialLoading === 'google' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'linear-gradient(45deg, #4285f4, #34a853, #fbbc05, #ea4335)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                G
              </div>
            )}
            {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
          </button>

          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={socialLoading !== null}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '500',
              cursor: socialLoading !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              opacity: socialLoading !== null ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (socialLoading === null) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = '#00d4ff';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {socialLoading === 'facebook' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#1877f2',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                f
              </div>
            )}
            {socialLoading === 'facebook' ? 'Connecting...' : 'Continue with Facebook'}
          </button>
        </div>

        {/* Terms and Privacy */}
        <p style={{ 
          fontSize: '12px', 
          color: '#888', 
          lineHeight: '1.6',
          textAlign: 'center',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          By continuing, you agree to the updated{' '}
          <a href="/terms-of-sale" target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', textDecoration: 'underline' }}>Terms of Sale</a>,{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', textDecoration: 'underline' }}>Terms of Service</a>, and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>

        {/* Info Note */}
        <div style={{
          marginTop: '24px',
          padding: '12px 16px',
          background: 'rgba(0, 212, 255, 0.05)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#00d4ff',
          textAlign: 'center'
        }}>
          ℹ️ MedWira uses social login for secure and convenient access
        </div>
      </div>
    </div>
  );
}
