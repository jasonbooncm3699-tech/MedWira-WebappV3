'use client';

import React, { useState } from 'react';
import { Bot, User, Send, Upload, Camera, Menu, X, Plus, MessageSquare, Settings, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/AuthModal';

export default function Home() {
  const { user, logout, isLoading } = useAuth();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleCameraCapture = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera not supported. Please use HTTPS or a modern browser.');
        return;
      }

      // Check if we're on HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        alert('Camera requires HTTPS. Please access via https://localhost:3000');
        return;
      }

      // Detect if device is tablet (simple detection)
      const isTabletDevice = window.innerWidth >= 768 && window.innerWidth <= 1024;
      setIsTablet(isTabletDevice);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' } // Force back camera
        }
      });

      setCameraStream(stream);
      setShowCamera(true);

    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access failed: ' + (error as Error).message + '\n\nTry:\n1. Allow camera permission\n2. Use HTTPS (https://localhost:3000)\n3. Use a modern browser');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button 
            className="burger-btn" 
            aria-label="Toggle menu"
            onClick={() => setSideNavOpen(!sideNavOpen)}
          >
            <Menu size={20} />
          </button>
          <button className="new-chat-header-btn">
            <Plus size={16} />
          </button>
          <select 
            className="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Chinese">中文</option>
            <option value="Malay">Malay</option>
            <option value="Indonesian">Indonesian</option>
            <option value="Thai">Thai</option>
            <option value="Vietnamese">Vietnamese</option>
            <option value="Tagalog">Tagalog</option>
            <option value="Burmese">Burmese</option>
            <option value="Khmer">Khmer</option>
            <option value="Lao">Lao</option>
          </select>
        </div>

        <div className="logo">
          <Bot size={24} />
        </div>

        <div className="header-right">
          {user ? (
            <button className="auth-btn" onClick={logout}>
              <LogOut size={16} />
              Sign Out
            </button>
          ) : (
            <button 
              className="auth-btn" 
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Side Navigation */}
      <nav className={`side-nav ${sideNavOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <button className="new-chat-btn">
            <Plus size={16} />
            New Chat
          </button>
          <button 
            className="close-nav"
            onClick={() => setSideNavOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-content">
          <div className="recent-chats">
            <h3>Recent Chats</h3>
            <div className="chat-list">
              <div className="chat-item active">
                <MessageSquare size={16} />
                <div className="chat-info">
                  <span className="chat-title">Medicine Identification</span>
                  <span className="chat-time">26 Sept</span>
                </div>
              </div>
              <div className="chat-item">
                <MessageSquare size={16} />
                <div className="chat-info">
                  <span className="chat-title">Dosage Information</span>
                  <span className="chat-time">25 Sept</span>
                </div>
              </div>
              <div className="chat-item">
                <MessageSquare size={16} />
                <div className="chat-info">
                  <span className="chat-title">Side Effects Query</span>
                  <span className="chat-time">23 Sept</span>
                </div>
              </div>
              <div className="chat-item">
                <MessageSquare size={16} />
                <div className="chat-info">
                  <span className="chat-title">Medicine Storage</span>
                  <span className="chat-time">19 Sept</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="nav-footer">
          <div className="user-info">
            <div className="user-avatar">
              <User size={20} />
            </div>
            <div className="user-details">
              <span className="username">{user ? user.name : 'Guest'}</span>
              <span className="tokens">{user ? `${user.tokens} tokens` : '0 tokens'}</span>
            </div>
          </div>
          {!user && (
            <button 
              className="faq-btn"
              onClick={() => {
                setAuthMode('register');
                setShowAuthModal(true);
              }}
            >
              <LogIn size={16} />
              Sign Up
            </button>
          )}
          <p className="copyright">@ 2025 MedWira.com. AI Powered medicine database</p>
        </div>
      </nav>

      {/* Chat Container */}
      <div className="chat-container">
        <div className="chat-window">
          <div className="message ai">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-text">Start this conversation by taking your medicine photo.</div>
              <div className="message-footer">
                <div className="message-time">19:46</div>
              </div>
            </div>
          </div>
          
          <div className="message user">
            <div className="message-avatar">
              <User size={20} />
            </div>
            <div className="message-content">
              <div className="message-image">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+" alt="Uploaded medicine" />
              </div>
              <div className="message-text">I&apos;ve uploaded an image of a medicine for identification.</div>
              <div className="message-footer">
                <div className="message-time">19:46</div>
              </div>
            </div>
          </div>
          
          <div className="message ai">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-text">Error: API key not configured. Please upload a clear photo of medicine packaging, pills, or related medical items for proper identification.</div>
              <div className="message-footer">
                <div className="message-time">19:46</div>
              </div>
            </div>
          </div>
        </div>

        <div className="input-container">
          {/* Allergy Input Field */}
          <div className="allergy-input-wrapper">
            <input
              type="text"
              placeholder="Enter allergies (e.g., penicillin, paracetamol)"
              className="allergy-input"
            />
          </div>

          <div className="input-wrapper">
            <input
              type="file"
              accept="image/*"
              id="upload"
              className="file-input"
            />
            <label htmlFor="upload" className="upload-btn">
              <Upload size={18} />
            </label>

            <button 
              className="camera-btn" 
              title="Take photo with camera" 
              onClick={handleCameraCapture}
            >
              <Camera size={18} />
            </button>

            <div className="text-input-wrapper">
              <input
                type="text"
                placeholder="Ask in English..."
                className="text-input"
              />
              <button className="send-btn">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'black', 
          zIndex: 1000 
        }}>
          <button 
            onClick={closeCamera} 
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              zIndex: 1001, 
              background: 'red', 
              color: 'white', 
              border: 'none', 
              padding: '10px', 
              borderRadius: '8px' 
            }}
          >
            Close
          </button>
          <video
            ref={(el) => {
              if (el && cameraStream) {
                el.srcObject = cameraStream;
              }
            }}
            autoPlay
            playsInline
            style={{ 
              width: '100%', 
              height: '100%',
              transform: isTablet ? 'scaleX(-1)' : 'none' // Fix mirroring on tablets only
            }}
          />
          <p style={{ 
            position: 'absolute', 
            bottom: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            color: 'white', 
            textAlign: 'center', 
            background: 'rgba(0,0,0,0.7)', 
            padding: '10px', 
            borderRadius: '8px' 
          }}>
            Camera Test - Device: {isTablet ? 'Tablet (mirror fix)' : 'Mobile (normal)'}
          </p>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  );
}