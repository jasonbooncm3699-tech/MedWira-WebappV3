'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SocialAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
}

export default function SocialAuthModal({ isOpen, onClose, mode }: SocialAuthModalProps) {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setSocialLoading(provider);
      setMessage('');
      console.log(`🔐 Starting ${provider} OAuth flow...`);

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
        setMessage(`${provider} login failed: ${error.message}`);
        setSocialLoading(null);
        return;
      }

      console.log(`✅ ${provider} OAuth initiated successfully`);
      // The page will redirect to the OAuth provider, so we don't need to close the modal here
      
    } catch (error) {
      console.error(`💥 ${provider} OAuth exception:`, error);
      setMessage(`${provider} login failed. Please try again.`);
      setSocialLoading(null);
    }
  };

  // Handle OAuth callback when component mounts
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      if (error) {
        console.error('❌ OAuth callback error:', error, errorDescription);
        setMessage(`Authentication failed: ${errorDescription || error}`);
        return;
      }

      // Check if we're on the auth callback page
      if (window.location.pathname === '/auth/callback') {
        try {
          const { data, error: callbackError } = await supabase.auth.getSession();
          
          if (callbackError) {
            console.error('❌ Session error after OAuth:', callbackError.message);
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
        }
      }
    };

    handleAuthCallback();
  }, []);

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
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
          >
            <X size={20} />
          </button>
        </div>

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

        {/* Error Message */}
        {message && (
          <div style={{ 
            marginTop: '20px',
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '14px',
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            color: '#ff4444',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

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
