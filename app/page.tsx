'use client';

import React, { useState, useEffect } from 'react';
import { Bot, User, Send, Upload, Camera, Menu, X, Plus, MessageSquare, Settings, LogOut, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import SocialAuthModal from '@/components/SocialAuthModal';
import InstallBanner from '@/components/InstallBanner';
import { MessageFormatter } from '@/lib/message-formatter';

export default function Home() {
  const { user, logout, isLoading } = useAuth();
  
  // Get welcome message in user's language
  const getWelcomeMessage = (lang: string): string => {
    const messages: { [key: string]: string } = {
      'English': '👋 Welcome to MedWira AI! Upload a photo of your medicine for instant identification and detailed analysis.',
      'Chinese': '👋 欢迎使用MedWira AI！上传您的药品照片即可获得即时识别和详细分析。',
      'Malay': '👋 Selamat datang ke MedWira AI! Muat naik foto ubat anda untuk pengenalan serta-merta dan analisis terperinci.',
      'Indonesian': '👋 Selamat datang di MedWira AI! Unggah foto obat Anda untuk identifikasi instan dan analisis mendalam.',
      'Thai': '👋 ยินดีต้อนรับสู่ MedWira AI! อัปโหลดรูปภาพยาของคุณเพื่อการระบุตัวตนทันทีและการวิเคราะห์โดยละเอียด',
      'Vietnamese': '👋 Chào mừng đến với MedWira AI! Tải lên hình ảnh thuốc của bạn để nhận dạng tức thì và phân tích chi tiết.',
      'Tagalog': '👋 Maligayang pagdating sa MedWira AI! I-upload ang larawan ng inyong gamot para sa instant identification at detalyadong analysis.',
      'Burmese': '👋 MedWira AI မှ ကြိုဆိုပါတယ်! သင့်ဆေးပုံကို တင်ပို့ပြီး အမြန်ခွဲခြားသိမြင်မှုနှင့် အသေးစိတ်ခွဲခြမ်းစိတ်ဖြာမှုရယူပါ။',
      'Khmer': '👋 សូមស្វាគមន៍មកកាន់ MedWira AI! ផ្ទុករូបភាពថ្នាំរបស់អ្នកឡើងសម្រាប់ការកំណត់អត្តសញ្ញាណភ្លាមៗ និងការវិភាគលម្អិត។',
      'Lao': '👋 ຍິນດີຕ້ອນຮັບສູ່ MedWira AI! ອັບໂລດຮູບພາບຢາຂອງທ່ານເພື່ອການກວດສອບແລະກຳນົດຕົວຕົນທັນທີ ແລະການວິເຄາະລາຍລະອຽດ.'
    };
    return messages[lang] || messages['English'];
  };

  // Get language display text based on device type
  const getLanguageDisplayText = (lang: string): string => {
    if (isMobile) {
      const abbreviations: { [key: string]: string } = {
        'English': 'EN',
        'Chinese': '中文',
        'Malay': 'MY',
        'Indonesian': 'ID',
        'Thai': 'TH',
        'Vietnamese': 'VN',
        'Tagalog': 'TL',
        'Burmese': 'MM',
        'Khmer': 'KH',
        'Lao': 'LA'
      };
      return abbreviations[lang] || 'EN';
    }
    return lang;
  };

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allergy, setAllergy] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    image?: string;
  }>>([
    {
      id: '1',
      type: 'ai',
      content: getWelcomeMessage('English'),
      timestamp: new Date()
    }
  ]);

  // Detect mobile device on initial load
  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth <= 767;
      setIsMobile(isMobileDevice);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

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
      
      // Detect if device is mobile
      const isMobileDevice = window.innerWidth <= 767;
      setIsMobile(isMobileDevice);

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

  // Capture photo from camera
  const capturePhoto = () => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // For tablets, flip the image
    if (isTablet) {
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const imageBase64 = reader.result as string;
        closeCamera();
        analyzeMedicineImage(imageBase64);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);
  };

  // Professional AI Image Analysis
  const analyzeMedicineImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          language,
          allergy
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Format the AI response professionally
        const formattedMessage = MessageFormatter.formatMedicineAnalysis(result);
        
        // Create user message
        const userMessage = {
          id: Date.now().toString(),
          type: 'user' as const,
          content: getUploadMessage(language),
          timestamp: new Date(),
          image: imageBase64
        };

        // Create AI response message
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: formattedMessage.content,
          timestamp: new Date()
        };

        // Add both messages to chat
        setMessages(prev => [...prev, userMessage, aiMessage]);

      } else {
        // Handle error response
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: `**Error:** ${result.error}`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: '**Error:** Analysis failed. Please try again with a clearer image.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get upload message in user's language
  const getUploadMessage = (lang: string): string => {
    const messages: { [key: string]: string } = {
      'English': 'I\'ve uploaded an image of a medicine for identification.',
      'Chinese': '我已上传药品图片进行识别。',
      'Malay': 'Saya telah memuat naik gambar ubat untuk pengenalan.',
      'Indonesian': 'Saya telah mengunggah gambar obat untuk identifikasi.',
      'Thai': 'ฉันได้อัปโหลดรูปภาพยาสำหรับการระบุตัวตน',
      'Vietnamese': 'Tôi đã tải lên hình ảnh thuốc để nhận dạng.',
      'Tagalog': 'Nai-upload ko na ang larawan ng gamot para sa pagkilala.',
      'Burmese': 'ဆေးဝါးများကို ခွဲခြားသိမြင်ရန် ပုံတစ်ပုံကို တင်ပို့ပြီးပါပြီ။',
      'Khmer': 'ខ្ញុំបានផ្ទុករូបភាពថ្នាំឡើងសម្រាប់ការកំណត់អត្តសញ្ញាណ។',
      'Lao': 'ຂ້ອຍໄດ້ອັບໂລດຮູບພາບຢາເພື່ອການກວດສອບແລະກຳນົດຕົວຕົນ.'
    };
    return messages[lang] || messages['English'];
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please select an image smaller than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageBase64 = reader.result as string;
      analyzeMedicineImage(imageBase64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="app">
      {/* Install Banner - CSS-only responsive behavior */}
      <InstallBanner />
      
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
            style={{
              appearance: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: isMobile ? '2px 4px' : '6px 12px',
              borderRadius: '8px',
              fontSize: isMobile ? '11px' : '13px',
              cursor: 'pointer',
              minWidth: isMobile ? '30px' : 'auto',
              maxWidth: isMobile ? '45px' : 'auto'
            }}
          >
            <option value="English">{isMobile ? 'EN' : 'English'}</option>
            <option value="Chinese">中文</option>
            <option value="Malay">{isMobile ? 'MY' : 'Malay'}</option>
            <option value="Indonesian">{isMobile ? 'ID' : 'Indonesian'}</option>
            <option value="Thai">{isMobile ? 'TH' : 'Thai'}</option>
            <option value="Vietnamese">{isMobile ? 'VN' : 'Vietnamese'}</option>
            <option value="Tagalog">{isMobile ? 'TL' : 'Tagalog'}</option>
            <option value="Burmese">{isMobile ? 'MM' : 'Burmese'}</option>
            <option value="Khmer">{isMobile ? 'KH' : 'Khmer'}</option>
            <option value="Lao">{isMobile ? 'LA' : 'Lao'}</option>
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
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="message-content">
                {message.image && (
                  <div className="message-image">
                    <img src={message.image} alt="Uploaded medicine" />
                  </div>
                )}
                <div className="message-text">
                  {message.content.includes('**') ? (
                    <div dangerouslySetInnerHTML={{ 
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>')
                        .replace(/⚠️/g, '⚠️')
                    }} />
                  ) : (
                    message.content
                  )}
                </div>
                <div className="message-footer">
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isAnalyzing && (
            <div className="message ai">
              <div className="message-avatar">
                <Bot size={20} />
              </div>
              <div className="message-content">
                <div className="message-text">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing your medicine image...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="input-container">
          {/* Allergy Input Field */}
          <div className="allergy-input-wrapper">
            <input
              type="text"
              placeholder="Enter allergies (e.g., penicillin, paracetamol)"
              className="allergy-input"
              value={allergy}
              onChange={(e) => setAllergy(e.target.value)}
            />
          </div>

          <div className="input-wrapper">
            <input
              type="file"
              accept="image/*"
              id="upload"
              className="file-input"
              onChange={handleFileUpload}
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
          <div style={{ 
            position: 'absolute', 
            bottom: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}>
            <button
              onClick={capturePhoto}
              style={{
                background: '#00d4ff',
                border: 'none',
                borderRadius: '50%',
                width: '70px',
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)'
              }}
            >
              <Camera size={30} color="white" />
            </button>
            <p style={{ 
              color: 'white', 
              textAlign: 'center', 
              background: 'rgba(0,0,0,0.7)', 
              padding: '8px 16px', 
              borderRadius: '8px',
              margin: 0,
              fontSize: '14px'
            }}>
              Tap to capture medicine photo
            </p>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      <SocialAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  );
}