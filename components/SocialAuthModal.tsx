'use client';

import React, { useState } from 'react';
import { X, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface SocialAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
}

export default function SocialAuthModal({ isOpen, onClose, mode, onModeChange }: SocialAuthModalProps) {
  const { login, register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null); // Track which social provider is loading
  const [message, setMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Add timeout to prevent infinite loading
  React.useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Authentication timeout - resetting loading state');
        setIsLoading(false);
        setMessage('Request timed out. Please try again.');
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Starting authentication process...', { mode, email: formData.email });
    setIsLoading(true);
    setMessage('');

    try {
      if (mode === 'register') {
        console.log('📝 Attempting registration...');
        // Use Supabase registration
        const result = await register(formData.email, formData.password);
        console.log('📝 Registration result:', result);
        
        if (result.success) {
          setMessage('Registration successful! Please check your email to verify your account.');
          setTimeout(() => {
            onClose();
            setFormData({ email: '', password: '' });
            setMessage('');
            setShowEmailForm(false);
          }, 1500);
        } else {
          setMessage(result.error || 'Registration failed. Please try again.');
        }
      } else {
        console.log('🔑 Attempting login...');
        // Use Supabase login
        const result = await login(formData.email, formData.password);
        console.log('🔑 Login result:', result);
        
        if (result.success) {
          setMessage('Login successful!');
          setTimeout(() => {
            onClose();
            setFormData({ email: '', password: '' });
            setMessage('');
            setShowEmailForm(false);
          }, 1500);
        } else {
          setMessage(result.error || 'Login failed. Please check your credentials.');
        }
      }
    } catch (error) {
      console.error('💥 Authentication error:', error);
      setMessage('An error occurred. Please try again.');
    } finally {
      console.log('✅ Authentication process completed, resetting loading state');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onModeChange('login')}
              style={{
                background: mode === 'login' ? '#00d4ff' : 'transparent',
                border: '1px solid #00d4ff',
                color: mode === 'login' ? '#000000' : '#00d4ff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => onModeChange('register')}
              style={{
                background: mode === 'register' ? '#00d4ff' : 'transparent',
                border: '1px solid #00d4ff',
                color: mode === 'register' ? '#000000' : '#00d4ff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Sign Up
            </button>
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
            }}
          >
            <X size={20} />
          </button>
        </div>

        {!showEmailForm ? (
          <>
            {/* Email Input Section */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                color: '#ccc',
                fontWeight: '500'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              />
            </div>

            <button
              onClick={() => setShowEmailForm(true)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '24px',
              }}
            >
              {mode === 'login' ? 'Continue to Sign In' : 'Continue to Sign Up'}
            </button>

            {/* Separator */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '24px',
              color: '#888',
              fontSize: '14px'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }}></div>
              <span style={{ margin: '0 16px' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }}></div>
            </div>

            {/* Social Login Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading !== null || isLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '16px',
                  cursor: socialLoading !== null || isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  opacity: socialLoading !== null || isLoading ? 0.6 : 1,
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
                disabled={socialLoading !== null || isLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '16px',
                  cursor: socialLoading !== null || isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  opacity: socialLoading !== null || isLoading ? 0.6 : 1,
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

            {/* Terms */}
            <p style={{ 
              fontSize: '12px', 
              color: '#888', 
              lineHeight: '1.5',
              textAlign: 'center'
            }}>
              By continuing, you agree to the updated{' '}
              <a href="#" style={{ color: '#00d4ff', textDecoration: 'underline' }}>Terms of Sale</a>,{' '}
              <a href="#" style={{ color: '#00d4ff', textDecoration: 'underline' }}>Terms of Service</a>, and{' '}
              <a href="#" style={{ color: '#00d4ff', textDecoration: 'underline' }}>Privacy Policy</a>.
            </p>
          </>
        ) : (
          /* Email Form */
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: '#888' 
                  }} 
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {message && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '14px',
                background: message.includes('successful') ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                border: message.includes('successful') ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255, 68, 68, 0.3)',
                color: message.includes('successful') ? '#00d4ff' : '#ff4444',
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: isLoading ? '#666' : 'linear-gradient(135deg, #00d4ff, #0099cc)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '16px',
              }}
            >
              {isLoading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px', color: '#888' }}>
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onModeChange('register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00d4ff',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onModeChange('login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00d4ff',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline',
                }}
              >
                ← Back to social login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
