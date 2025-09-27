'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
}

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const { login, register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      let result;
      if (mode === 'login') {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.email, formData.password, formData.name);
      }

      if (result.success) {
        setMessage(result.message);
        setTimeout(() => {
          onClose();
          setFormData({ name: '', email: '', password: '' });
          setMessage('');
        }, 1500);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{mode === 'login' ? 'Sign In' : 'Sign Up'}</h2>
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

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User 
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
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
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
          )}

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
              <Lock 
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
        </form>
      </div>
    </div>
  );
}
