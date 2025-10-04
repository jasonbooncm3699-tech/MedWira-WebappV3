// Test Auto-Deploy - 11:34 PM +08, Sept 28

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bot, User, Send, Upload, Camera, Menu, X, Plus, MessageSquare, Settings, LogOut, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import SocialAuthModal from '@/components/SocialAuthModal';
import StructuredMedicineReply from '@/components/StructuredMedicineReply';
import ReferralCodeDisplay from '@/components/ReferralCodeDisplay';
import CompactReferralButton from '@/components/CompactReferralButton';
import AIStatusDisplay from '@/components/AIStatusDisplay';
import { getInitials, generateAvatarColor } from '@/lib/avatar-utils';
import { MessageFormatter } from '@/lib/message-formatter';
import { DatabaseService } from '@/lib/supabase';

export default function Home() {
  const { user, logout, isLoading, refreshUser, refreshUserData } = useAuth();
  
  // Helper function to extract first name from display_name
  const getFirstName = (displayName?: string): string => {
    if (!displayName) return 'User';
    const firstWord = displayName.trim().split(' ')[0];
    return firstWord || 'User';
  };
  
  // Get welcome message in user's language
  const getWelcomeMessage = (lang: string): string => {
    const messages: { [key: string]: string } = {
      'English': 'Hi👋 Start this conversation by taking your medicine photo.',
      'Chinese': '你好👋 通过拍摄您的药品照片开始这次对话。',
      'Malay': 'Hai👋 Mulakan perbualan ini dengan mengambil foto ubat anda.',
      'Indonesian': 'Hai👋 Mulai percakapan ini dengan mengambil foto obat Anda.',
      'Thai': 'สวัสดี👋 เริ่มการสนทนานี้โดยถ่ายภาพยาของคุณ',
      'Vietnamese': 'Xin chào👋 Bắt đầu cuộc trò chuyện này bằng cách chụp ảnh thuốc của bạn.',
      'Tagalog': 'Kumusta👋 Simulan ang usapang ito sa pamamagitan ng pagkuha ng larawan ng inyong gamot.',
      'Burmese': 'မင်္ဂလာပါ👋 သင့်ဆေးပုံကို ရိုက်ယူခြင်းဖြင့် ဤစကားပြောဆိုမှုကို စတင်ပါ။',
      'Khmer': 'សួស្តី👋 ចាប់ផ្តើមការសន្ទនានេះដោយថតរូបថ្នាំរបស់អ្នក។',
      'Lao': 'ສະບາຍດີ👋 ເລີ່ມການສົນທະນານີ້ໂດຍການຖ່າຍຮູບຢາຂອງທ່ານ.'
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
  const [showFAQ, setShowFAQ] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [userTokens, setUserTokens] = useState<number>(user?.tokens || 0);
  const [inputText, setInputText] = useState('');
  const [aiStatus, setAiStatus] = useState<'idle' | 'Analyzing Image...' | 'Checking Medicine Database...' | 'Augmenting Data via Web Search...' | 'Summarizing and Formatting Response...'>('idle');
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai' | 'structured';
    content: string;
    timestamp: Date;
    image?: string;
    structuredData?: any;
  }>>([
    {
      id: '1',
      type: 'ai',
      content: getWelcomeMessage('English'),
      timestamp: new Date()
    }
  ]);

  // Function to check authentication and tokens before allowing actions
  const checkAuthentication = (): boolean => {
    if (!user) {
      setShowRegistrationModal(true);
      return false;
    }
    
    // Check if user has tokens available (defensive check)
    if (user && user.tokens <= 0) {
      const errorMessage = {
        id: Date.now().toString(),
        type: 'ai' as const,
        content: '⚠️ **Insufficient Tokens**\n\nYou have no tokens remaining. Please earn more tokens through referrals or contact support.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return false;
    }
    
    return true;
  };

  // Handle text input submission
  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    
    // Refresh user data to get latest token count before proceeding
    await refreshUserData();
    
    // Check authentication and tokens before proceeding
    if (!checkAuthentication()) {
      return;
    }

    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message to chat
    const newUserMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsAnalyzing(true);
    
    // Ensure user is authenticated and the ID is present
    if (!user || !user.id) {
      // CRITICAL: Prevent API call if authentication is missing
      console.error("❌ Cannot send request: User not authenticated.");
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "⚠️ **Authentication Required**\n\nPlease log in to use the medicine analysis feature.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsAnalyzing(false);
      return; // EARLY EXIT to prevent bad request
    }

    // 1. Defensively retrieve values from state/context
    // Use ?? (Nullish Coalescing) to force non-undefined, valid JSON types.
    console.log('🔍 Debug - User object (text):', { user, userId: user?.id, userType: typeof user });
    const userId = user?.id ?? ''; // If user is null, userId is '' (empty string)
    const imageBase64 = null; // Text-only query, so always null
    const textQuery = userMessage ?? ''; // If no text, textQuery is '' (empty string)
    
    console.log('🔍 Debug - Extracted values (text):', { userId, imageBase64, textQuery });

    // 2. CRITICAL VALIDATION: Abort if user is missing (prevents unauthenticated token check)
    if (!userId) {
      // Abort logic: stop loading, show error message
      setIsAnalyzing(false);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "⚠️ **Authentication Required**\n\nAuthentication required to use AI features.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return; // STOP EXECUTION
    }

    // 3. Construct the GUARANTEED valid JSON payload
    const payload = {
      image_data: imageBase64, // Will be null (valid JSON)
      user_id: userId, // Will be a string
      text_query: textQuery, // Will be a string
    };

    try {
      const response = await fetch('/api/analyze-medicine-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The body is now guaranteed to be valid JSON.
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (response.status === 200 && result.status === 'SUCCESS') {
        // Add AI response
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: result.data?.text || result.message || 'Analysis complete',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Add structured data if available (new Gemini format)
        if (result.data && (result.data.medicine_name || result.data.purpose)) {
          const structuredMessage = {
            id: (Date.now() + 2).toString(),
            type: 'structured' as const,
            content: '',
            timestamp: new Date(),
            structuredData: result.data // New Gemini format
          };
          setMessages(prev => [...prev, structuredMessage]);
        }
        
        // Update user tokens
        if (result.tokensRemaining !== undefined) {
          setUserTokens(result.tokensRemaining);
          // Also refresh user data to get latest tokens and referral info
          await refreshUserData();
        }
      } else if (response.status === 402) {
        // Handle insufficient tokens error
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: `⚠️ **Insufficient Tokens**\n\n${result.message || 'You have no tokens remaining. Please earn more tokens through referrals or contact support.'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        // Update tokens if provided
        if (result.tokensRemaining !== undefined) {
          setUserTokens(result.tokensRemaining);
          await refreshUserData();
        }
      } else {
        // Handle other errors
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: `**Error**\n\n${result.message || result.error || 'Analysis failed. Please try again.'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error analyzing medicine:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: 'Sorry, I encountered an error while analyzing your medicine. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  // Function to start a new chat
  const handleNewChat = () => {
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: getWelcomeMessage(language),
        timestamp: new Date()
      }
    ]);
    setSideNavOpen(false); // Close side nav after starting new chat
  };


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

  // Handle session refresh from OAuth callback
  useEffect(() => {
    // Only run on client side after hydration
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_refresh') === 'true') {
      console.log('🔄 Session refresh detected in page.tsx, updating user state...');
      
      // Give auth context time to process the session
      setTimeout(() => {
        refreshUser();
        // Clean up URL parameter
        window.history.replaceState({}, '', window.location.pathname);
      }, 1000);
    }
  }, [refreshUser]);

  // Force UI re-render when user state changes
  useEffect(() => {
    console.log('👤 User state changed in page.tsx:', {
      isAuthenticated: !!user,
      email: user?.email,
      tokens: user?.tokens,
      name: user?.name,
      referral_code: user?.referral_code,
      referral_count: user?.referral_count,
      isLoading: isLoading
    });
    
    // Update local token state when user changes
    if (user?.tokens !== undefined) {
      setUserTokens(user.tokens);
    }
    
    // CRITICAL: If user is authenticated but missing tokens or referral code, refresh data
    if (user && !isLoading) {
      if (user.tokens === 0 || !user.referral_code) {
        console.log('🔄 User missing tokens or referral code, attempting to refresh user data...', {
          tokens: user.tokens,
          hasReferralCode: !!user.referral_code
        });
        setTimeout(() => {
          refreshUserData();
        }, 1000);
      }
    }
  }, [user, isLoading, refreshUserData]);


  // Fetch user chat history when user logs in
  useEffect(() => {
    const fetchUserChatHistory = async () => {
      if (user?.id) {
        try {
          const history = await DatabaseService.getUserScanHistory(user.id);
          setScanHistory(history || []);
          console.log('✅ Chat history loaded:', history?.length || 0, 'conversations');
        } catch (error) {
          console.error('❌ Failed to fetch chat history:', error);
          setScanHistory([]);
        }
      } else {
        setScanHistory([]);
      }
    };

    fetchUserChatHistory();
  }, [user]);

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
    // Check authentication before proceeding
    if (!checkAuthentication()) {
      closeCamera();
      return;
    }

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

  // Enhanced AI Image Analysis with Real-Time Status Display
  const analyzeMedicineImage = async (imageBase64: string) => {
    // Refresh user data to get latest token count before proceeding
    await refreshUserData();
    
    if (!checkAuthentication()) return;

    setIsAnalyzing(true);
    setAiStatus('Analyzing Image...');

    // Create user message immediately
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: "I've uploaded an image of a medicine for identification.",
      timestamp: new Date(),
      image: imageBase64
    };

    setMessages(prev => [...prev, userMessage]);

    // Ensure user is authenticated and the ID is present
    if (!user || !user.id) {
      // CRITICAL: Prevent API call if authentication is missing
      console.error("❌ Cannot send request: User not authenticated.");
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "⚠️ **Authentication Required**\n\nPlease log in to use the medicine analysis feature.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsAnalyzing(false);
      setAiStatus('idle');
      return; // EARLY EXIT to prevent bad request
    }

    // 1. Defensively retrieve values from state/context
    // Use ?? (Nullish Coalescing) to force non-undefined, valid JSON types.
    console.log('🔍 Debug - User object:', { user, userId: user?.id, userType: typeof user });
    const userId = user?.id ?? ''; // If user is null, userId is '' (empty string)
    const imageBase64Data = imageBase64 ?? null; // If no image, imageBase64 is null (valid JSON)
    const textQuery = "Please analyze this medicine image and provide detailed information."; // The user's text message
    
    console.log('🔍 Debug - Extracted values:', { userId, imageBase64Data: !!imageBase64Data, textQuery });

    // 2. CRITICAL VALIDATION: Abort if user is missing (prevents unauthenticated token check)
    if (!userId) {
      // Abort logic: stop loading, show error message
      setIsAnalyzing(false);
      setAiStatus('idle');
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "⚠️ **Authentication Required**\n\nAuthentication required to use AI features.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return; // STOP EXECUTION
    }

    // 3. Construct the GUARANTEED valid JSON payload
    const payload = {
      image_data: imageBase64Data, // Will be string or null
      user_id: userId, // Will be a string
      text_query: textQuery, // Will be a string
    };

    // 4. DEBUG: Log the payload to ensure it's valid
    console.log('🔍 Sending payload:', {
      hasImageData: !!payload.image_data,
      imageDataLength: payload.image_data?.length || 0,
      userId: payload.user_id,
      textQuery: payload.text_query,
      payloadType: typeof payload
    });

    try {
      // Real AI processing - no fake delays
      setAiStatus('Analyzing Image...');

      const response = await fetch('/api/analyze-medicine-gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // The body is now guaranteed to be valid JSON.
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      // Reset AI status
      setAiStatus('idle');
      
      if (response.status === 200 && result.status === 'SUCCESS') {
        // Create structured AI response message with comprehensive data
        const structuredMessage = {
          id: (Date.now() + 1).toString(),
          type: 'structured' as const,
          content: `**Medicine Analysis Complete**\n\n**Medicine:** ${result.data?.medicine_name || 'N/A'}\n**Purpose:** ${result.data?.purpose || 'N/A'}`,
          timestamp: new Date(),
          structuredData: result.data
        };

        // Update user tokens
        if (result.tokensRemaining !== undefined) {
          setUserTokens(result.tokensRemaining);
          // Also refresh user data to get latest tokens and referral info
          if (user) {
            await refreshUserData();
          }
        }

        // Add structured message to chat
        setMessages(prev => [...prev, structuredMessage]);

      } else {
        // Handle error responses (including insufficient tokens)
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: `**${response.status === 402 ? '⚠️ Insufficient Tokens' : 'Error'}**\n\n${result.message || result.error || 'Analysis failed. Please try again.'}`,
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
      setAiStatus('idle');
    }
  };

  // Get upload message in user's language
  const getUploadMessage = (lang: string): string => {
    const messages: { [key: string]: string } = {
      'English': 'I&apos;ve uploaded an image of a medicine for identification.',
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

    // Check authentication before proceeding
    if (!checkAuthentication()) {
      // Reset the file input
      e.target.value = '';
      return;
    }

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

  // CRITICAL FIX: Implement strict rendering gate to prevent React error #418 (hydration mismatch)
  // This must be placed AFTER all hooks to comply with Rules of Hooks
  if (isLoading) {
    // RENDER ONLY A STABLE, SIMPLE LOADER TO PREVENT HYDRATION MISMATCH
    return (
      <div className="app">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0a',
          color: '#ffffff'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px'
          }}>
            <Loader2 size={24} className="animate-spin" />
            <span>Initializing MedWira AI...</span>
          </div>
          <p style={{
            marginTop: '16px',
            fontSize: '14px',
            opacity: 0.7
          }}>
            Setting up your medicine assistant
          </p>
        </div>
      </div>
    );
  }

  // TEMPORARY: Allow normal interface to show sign-in button
  // The normal interface will handle the unauthenticated state properly

  // RENDER THE MAIN APPLICATION ONLY WHEN LOADING IS COMPLETE AND USER IS VALID
  // This prevents React error #418 (hydration mismatch) and null pointer crashes
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
            <Image 
              src="/MedWira logo.001.svg" 
              alt="MedWira" 
              className="header-logo"
              priority
            />
          </div>
          
          <div className="header-right">
          {user ? (
            <div className="user-dropdown">
              <button className="auth-btn user-profile-btn">
                <User size={16} />
{getFirstName(user?.display_name)}
              </button>
              <div className="dropdown-menu">
                <div className="dropdown-item">
                  <User size={16} />
                  Profile
                </div>
                <div className="dropdown-item">
                  <span>Tokens: {user?.tokens || 0}</span>
                </div>
                <div className="dropdown-item">
                  <span>Tier: {user?.subscription_tier || 'free'}</span>
                </div>
                {user?.referral_code && (
                  <div className="dropdown-item">
                    <span>Referral: {user.referral_code}</span>
                  </div>
                )}
                <div className="dropdown-divider"></div>
                <div className="dropdown-item" onClick={logout}>
                  <LogOut size={16} />
                  Sign Out
                </div>
              </div>
            </div>
          ) : (
            <button 
              className="auth-btn" 
              onClick={() => {
                console.log('🔐 Sign In / Sign Up button clicked');
                console.log('🔐 Current showAuthModal state:', showAuthModal);
                console.log('🔐 Current authMode state:', authMode);
                setAuthMode('login');
                setShowAuthModal(true);
                console.log('🔐 Auth modal should be opening...');
                console.log('🔐 New showAuthModal state:', true);
                console.log('🔐 New authMode state:', 'login');
              }}
            >
              Sign In / Sign Up
            </button>
          )}
          </div>
      </header>

        {/* Side Navigation */}
        <nav className={`side-nav ${sideNavOpen ? 'open' : ''}`}>
          <div className="nav-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
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
              <h3>Chat History</h3>
              <div className="chat-list">
                {scanHistory.length > 0 ? (
                  scanHistory.slice(0, 5).map((scan, index) => (
                    <div key={scan.id} className="chat-item">
                    <MessageSquare size={16} />
                    <div className="chat-info">
                        <span className="chat-title">
                          {scan.medicine_name || 'Medicine Scan'}
                        </span>
                        <span className="chat-time">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-scans">
                    <p>No scans yet</p>
                    <p className="scan-hint">Upload a medicine image to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="nav-footer">
            <div className="user-info">
              <div className="user-avatar">
                {user?.avatar_url && user.avatar_url.trim() !== '' ? (
                  <Image 
                    src={user.avatar_url} 
                    alt={getFirstName(user?.display_name) || user?.email} 
                    className="nav-avatar-image"
                    width={32}
                    height={32}
                  />
                ) : (
                  <div 
                    className="nav-avatar-initials"
                    style={{ 
                      backgroundColor: generateAvatarColor(user?.display_name || user?.name || user?.email),
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      minHeight: '32px'
                    }}
                  >
                    {getInitials(user?.name || user?.display_name || user?.email)}
                  </div>
                )}
              </div>
              <div className="user-details">
                <span className="username">{user ? getFirstName(user?.display_name) : 'Guest'}</span>
                <span className="tokens">{user ? `${user?.tokens || 0} tokens` : '0 tokens'}</span>
                {user && (
                  <span className="tier">{user?.subscription_tier || 'free'}</span>
                )}
              </div>
            </div>
            
            {/* Compact Referral Code Button */}
            <div className="referral-section">
              <p className="referral-header-text">Share to earn free tokens</p>
              {user?.referral_code ? (
                <CompactReferralButton 
                  referralCode={user.referral_code}
                  className="nav-referral-button"
                />
              ) : user ? (
                <div className="referral-code-placeholder">
                  <span>Loading referral code...</span>
                </div>
              ) : (
                <div className="referral-code-placeholder">
                  <span>Sign In Required</span>
                </div>
              )}
            </div>
            
            <button 
              className="nav-faq-btn"
              onClick={() => setShowFAQ(!showFAQ)}
            >
              {showFAQ ? 'Hide FAQ' : 'FAQ'}
            </button>
            <p className="copyright">@ 2025 MedWira.com. AI Powered medicine database</p>
          </div>
        </nav>

        {/* FAQ Modal */}
        {showFAQ && (
          <div className="faq-modal">
            <div className="faq-content">
              <div className="faq-header">
                <h2>Frequently Asked Questions</h2>
                <button 
                  className="faq-close"
                  onClick={() => setShowFAQ(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="faq-section">
                <h3>📱 How to Use MedWira AI</h3>
                <div className="faq-item">
                  <h4>How do I scan a medicine?</h4>
                  <p>Click the camera button (📷) or upload button (📁) in the input area. Take a clear photo of the medicine packaging, label, or pill. Our AI will analyze it instantly.</p>
                </div>
                
                <div className="faq-item">
                  <h4>What information will I get?</h4>
                  <p>You&apos;ll receive detailed information including medicine name, active ingredients, dosage, side effects, interactions, and usage instructions.</p>
                </div>
                
                <div className="faq-item">
                  <h4>Is the camera feature free?</h4>
                  <p>Yes! Camera scanning is free for all users. You get 10 free scans per day, with additional scans available through our token system.</p>
                </div>
              </div>

              <div className="faq-section">
                <h3>🔐 Account & Authentication</h3>
                <div className="faq-item">
                  <h4>Do I need to sign up?</h4>
                  <p>No! You can use MedWira AI without an account. However, signing up allows you to save chat history and get more tokens.</p>
                </div>
                
                <div className="faq-item">
                  <h4>How do I sign up?</h4>
                  <p>Click &quot;Sign In / Sign Up&quot; in the header, then choose &quot;Sign Up&quot;. You can use Google, Apple, or email to create your account.</p>
                </div>
                
                <div className="faq-item">
                  <h4>What are tokens?</h4>
                  <p>Tokens are used for additional scans beyond your free daily limit. You earn tokens by signing up, referring friends, or purchasing premium plans.</p>
                </div>
              </div>

              <div className="faq-section">
                <h3>💊 Medicine Information</h3>
                <div className="faq-item">
                  <h4>How accurate is the medicine identification?</h4>
                  <p>Our AI is trained on extensive medicine databases and achieves high accuracy. However, always consult healthcare professionals for medical decisions.</p>
                </div>
                
                <div className="faq-item">
                  <h4>Can I scan any medicine?</h4>
                  <p>Yes! MedWira can identify prescription drugs, over-the-counter medicines, supplements, and herbal products from around the world.</p>
                </div>
                
                <div className="faq-item">
                  <h4>What if the medicine isn&apos;t recognized?</h4>
                  <p>If our AI can&apos;t identify the medicine, try taking a clearer photo of the packaging or label. You can also describe the medicine in text.</p>
                </div>
              </div>

              <div className="faq-section">
                <h3>🌍 Language & Support</h3>
                <div className="faq-item">
                  <h4>What languages are supported?</h4>
                  <p>Currently, MedWira responds in English, but you can ask questions in your preferred language. We&apos;re working on multi-language support.</p>
                </div>
                
                <div className="faq-item">
                  <h4>How do I change the language?</h4>
                  <p>Use the language selector in the header to choose your preferred language. The AI will respond in the selected language.</p>
                </div>
                
                <div className="faq-item">
                  <h4>Is this a replacement for medical advice?</h4>
                  <p>No! MedWira provides information only. Always consult healthcare professionals for medical advice, diagnosis, or treatment decisions.</p>
                </div>
              </div>

              <div className="faq-section">
                <h3>📱 Technical Support</h3>
                <div className="faq-item">
                  <h4>Camera not working?</h4>
                  <p>Make sure you&apos;re using HTTPS or localhost. Allow camera permissions in your browser. Try refreshing the page or using the upload button instead.</p>
                </div>
                
                <div className="faq-item">
                  <h4>App not loading?</h4>
                  <p>Check your internet connection. Clear your browser cache. Try refreshing the page or using a different browser.</p>
                </div>
                
                <div className="faq-item">
                  <h4>Need more help?</h4>
                  <p>Contact us through the app or visit our support page. We&apos;re here to help with any technical issues or questions.</p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Chat Container */}
      <div className="main-content chat-container">
        <div className="chat-window">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-content">
                  {message.image && (
                    <div className="message-image">
                      <Image src={message.image} alt="Uploaded medicine" width={200} height={200} />
                    </div>
                  )}
                  
                  {/* Render structured medicine reply for structured messages */}
                  {message.type === 'structured' && message.structuredData ? (
                    <div className="structured-medicine-response">
                      <div className="message-text">
                        {message.content && message.content.includes('**') ? (
                          <div dangerouslySetInnerHTML={{ 
                            __html: message.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br>')
                              .replace(/⚠️/g, '⚠️')
                          }} />
                        ) : (
                          <span>{message.content || ''}</span>
                        )}
                      </div>
                      <StructuredMedicineReply response={message.structuredData} />
                    </div>
                  ) : (
                    <div className="message-text">
                      {message.content && message.content.includes('**') ? (
                        <div dangerouslySetInnerHTML={{ 
                          __html: message.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br>')
                            .replace(/⚠️/g, '⚠️')
                        }} />
                      ) : (
                        <span>{message.content || ''}</span>
                      )}
                    </div>
                  )}
                  
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
            <AIStatusDisplay status={aiStatus} />
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
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button 
                  className="send-btn"
                  onClick={handleTextSubmit}
                  disabled={!inputText.trim() || isAnalyzing}
                >
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

      {/* Registration Wall Modal */}
      {showRegistrationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{
                color: '#00d4ff',
                fontSize: '20px',
                fontWeight: '600',
                margin: 0
              }}>
                🔐 Register to continue
              </h2>
              <button
                onClick={() => setShowRegistrationModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              <p style={{
                color: '#ffffff',
                fontSize: '16px',
                marginBottom: '16px'
              }}>
                <strong style={{color: '#00d4ff'}}>Free 30 tokens, No credit card</strong>
              </p>
              
              <div style={{
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  color: '#00d4ff',
                  fontSize: '16px',
                  marginBottom: '8px',
                  margin: '0 0 8px 0'
                }}>
                  🎁 What you get with registration:
                </h3>
                <ul style={{
                  color: '#ccc',
                  fontSize: '14px',
                  margin: 0,
                  paddingLeft: '20px'
                }}>
                  <li>30 free tokens for medicine scans</li>
                  <li>Save your chat history</li>
                  <li>Access to premium features</li>
                  <li>Priority customer support</li>
                </ul>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowRegistrationModal(false);
                  setAuthMode('register');
                  setShowAuthModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #0099cc, #007aa3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #00d4ff, #0099cc)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Sign Up
              </button>
              
              <button
                onClick={() => setShowRegistrationModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}