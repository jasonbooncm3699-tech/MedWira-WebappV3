// Test Auto-Deploy - 11:34 PM +08, Sept 28

'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
// Using DatabaseService instead of broken getUserScanHistory import
import { chatStorage, ChatMessage } from '@/lib/chat-storage';
import { Share2 } from 'lucide-react';

export default function Home() {
  // Test deployment - simple change
  const { user, logout, isLoading, refreshUser, refreshUserData } = useAuth();

  // Helper function to extract first name from display_name
  const getFirstName = (displayName?: string): string => {
    if (!displayName) return 'User';
    const firstWord = displayName.trim().split(' ')[0];
    return firstWord || 'User';
  };

  // WhatsApp sharing function
  const shareToWhatsApp = (analysisText: string) => {
    const message = `💊 Medicine Analysis from MedWira AI:\n\n${analysisText}\n\n🔗 Shared from MedWira AI - Your Medicine Assistant`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
  const [aiStatus, setAiStatus] = useState<string>('idle');
  const [useRealStatusUpdates, setUseRealStatusUpdates] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
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

    // Check basic authentication (user exists) but NOT tokens yet
    if (!user) {
      setShowRegistrationModal(true);
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

    // FORCE DEFENSIVE PAYLOAD CREATION - Use ?? to force non-undefined, valid JSON types
    const userId = user?.id ?? '';
    const imageBase64 = null; // Text-only query, always null
    const textQuery = userMessage ?? '';

    // CRITICAL VALIDATION: Keep this check and add a user-facing error message
    if (!userId) {
      setIsAnalyzing(false);
      // Add a chat message here: "Authentication required. Please log in to use AI analysis."
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "⚠️ **Authentication Required**\n\nAuthentication required. Please log in to use AI analysis.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return; // EXIT HERE ONLY IF UNAUTHENTICATED
    }

    // -------------------------------------------------------------
    // DEBUGGING LOGS (Keep these to confirm execution)
    console.log('🔍 Debug - Extracted values:', { userId, imageBase64: imageBase64 ? 'BASE64_EXISTS' : null, textQuery });
    // -------------------------------------------------------------

    // Construct the GUARANTEED valid JSON payload
    const payload = {
      imageBase64: imageBase64,
      userId: userId,
      language: language,
      allergy: allergy,
    };

    try {
      const response = await fetch('/api/analyze-image', {
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


  // Function to fetch user chat history (localStorage + database)
  const fetchUserChatHistory = useCallback(async () => {
    if (user?.id) {
      try {
        // First, load from localStorage for instant display
        const localMessages = chatStorage.loadChatHistory(user.id);
        if (localMessages.length > 0) {
          console.log('✅ Chat history loaded from localStorage:', localMessages.length, 'messages');
          setMessages(localMessages);
        }

        // Then, fetch from database for sync
        let history: any[] = [];
        try {
          console.log('🔍 Calling DatabaseService.getUserScanHistory for user:', user.id);
          history = await DatabaseService.getUserScanHistory(user.id);
          setScanHistory(history || []);
          console.log('✅ Scan history loaded from database:', history?.length || 0, 'conversations');
        } catch (error) {
          console.error('❌ Error fetching scan history:', error);
          // Don't fail the entire function if scan history fails
          setScanHistory([]);
        }

        // If database has newer data, update localStorage
        if (history && history.length > 0) {
          const lastDbUpdate = new Date(Math.max(...history.map(h => new Date(h.created_at).getTime())));
          const lastLocalUpdate = localMessages.length > 0 ?
            new Date(Math.max(...localMessages.map(m => m.timestamp.getTime()))) : new Date(0);

          if (lastDbUpdate > lastLocalUpdate) {
            console.log('🔄 Database has newer data, updating localStorage');
            // Convert scan history to messages format and save to localStorage
            const dbMessages: ChatMessage[] = history.slice(0, 5).map(scan => ({
              id: `scan_${scan.id}`,
              type: 'structured' as const,
              content: '',
              timestamp: new Date(scan.created_at),
              structuredData: {
                medicine_name: scan.medicine_name,
                purpose: scan.purpose || 'Medicine analysis',
                raw_analysis: `Medicine: ${scan.medicine_name}\nAnalysis completed on ${new Date(scan.created_at).toLocaleDateString()}`
              }
            }));

            // Merge with existing messages and save
            const mergedMessages = [...localMessages.filter(m => !m.id.startsWith('scan_')), ...dbMessages];
            chatStorage.saveChatHistory(mergedMessages, user.id);
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch chat history:', error);
        setScanHistory([]);
      }
    } else {
      // For non-authenticated users, load from localStorage only
      const localMessages = chatStorage.loadChatHistory();
      if (localMessages.length > 0) {
        console.log('✅ Chat history loaded from localStorage (guest):', localMessages.length, 'messages');
        setMessages(localMessages);
      }
      setScanHistory([]);
    }
  }, [user?.id]);

  // Load chat history on initial page load (before user authentication)
  useEffect(() => {
    // Load from localStorage immediately for instant display
    const localMessages = chatStorage.loadChatHistory();
    if (localMessages.length > 0) {
      console.log('✅ Initial chat history loaded from localStorage:', localMessages.length, 'messages');
      setMessages(localMessages);
    }
  }, []);

  // Fetch user chat history when user logs in
  useEffect(() => {
    fetchUserChatHistory();
  }, [fetchUserChatHistory]);


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
        console.log(`📊 [Frontend] Camera photo loaded - calling analyzeMedicineImageWithRealStatus`);
        const imageBase64 = reader.result as string;
        closeCamera();
        // Always use real status updates from AI processing
        analyzeMedicineImageWithRealStatus(imageBase64);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);
  };

  // SSE-based AI Image Analysis with Real-Time Status Display
  const analyzeMedicineImageWithRealStatus = async (imageBase64: string) => {
    console.log(`📊 [Frontend] ===== FUNCTION CALLED =====`);
    console.log(`📊 [Frontend] Image length: ${imageBase64.length} characters`);
    console.log(`📊 [Frontend] User state:`, { user: !!user, userId: user?.id });
    
    // Refresh user data to get latest token count before proceeding
    console.log(`📊 [Frontend] Refreshing user data...`);
    await refreshUserData();
    console.log(`📊 [Frontend] User data refreshed`);

    // Check basic authentication (user exists) but NOT tokens yet
    if (!user) {
      console.log(`📊 [Frontend] No user - showing registration modal`);
      setShowRegistrationModal(true);
      return;
    }
    console.log(`📊 [Frontend] User authenticated - proceeding with analysis`);

    setIsAnalyzing(true);
    setAiStatus('Initializing AI...');

    // Create user message immediately
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: "I've uploaded an image of a medicine for identification.",
      timestamp: new Date(),
      image: imageBase64
    };

    setMessages(prev => {
      const updatedMessages = [...prev, userMessage];
      // Save to localStorage immediately
      chatStorage.saveChatHistory(updatedMessages, user?.id);
      return updatedMessages;
    });

    // FORCE DEFENSIVE PAYLOAD CREATION - Use ?? to force non-undefined, valid JSON types
    const userId = user?.id ?? '';
    const imageBase64Data = imageBase64 ?? null;
    const textQuery = "Please analyze this medicine image and provide detailed information.";

    // CRITICAL VALIDATION: Keep this check and add a user-facing error message
    console.log(`📊 [Frontend] User ID validation:`, { userId, userIdLength: userId.length });
    if (!userId) {
      console.log(`📊 [Frontend] No user ID - authentication failed`);
      setIsAnalyzing(false);
      setAiStatus('idle');
      // Add a chat message here: "Authentication required. Please log in to use AI analysis."
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "⚠️ **Authentication Required**\n\nAuthentication required. Please log in to use AI analysis.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return; // EXIT HERE ONLY IF UNAUTHENTICATED
    }
    console.log(`📊 [Frontend] User ID validated - proceeding to fetch`);

    try {
      console.log(`📊 [Frontend] Starting fetch to /api/analyze-image-stream`);
      const response = await fetch('/api/analyze-image-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64Data,
          userId: userId,
          language: 'English',
          textQuery: textQuery,
          userAllergies: allergy
        })
      });

      console.log(`📊 [Frontend] Fetch response received:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.body) {
        console.error(`📊 [Frontend] No response body received`);
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      console.log(`📊 [Frontend] Starting SSE reader loop`);

      while (true) {
        console.log(`📊 [Frontend] Reading next chunk...`);
        const { done, value } = await reader.read();
        console.log(`📊 [Frontend] Read result:`, { done, hasValue: !!value, valueLength: value?.length });
        if (done) {
          console.log(`📊 [Frontend] SSE stream ended`);
          // If we're still analyzing and haven't received a complete result, there might be an issue
          if (isAnalyzing && aiStatus !== 'idle') {
            console.warn(`📊 [Frontend] Stream ended but analysis still in progress. Status: ${aiStatus}`);
            console.error(`📊 [Frontend] Analysis incomplete - backend stream ended prematurely`);
            setAiStatus('idle');
            setIsAnalyzing(false);
          }
          break;
        }

        const chunk = decoder.decode(value);
        console.log(`📊 [Frontend] Received SSE chunk:`, chunk);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log(`📊 [Frontend] Parsed SSE data:`, data);

              if (data.type === 'status' && data.status) {
                // Real status update from backend
                setAiStatus(data.status);
                
                // Handle completion status
                if (data.status === 'Analysis completed successfully') {
                  console.log(`📊 [Frontend] Analysis completed - preparing to show output`);
                  // Don't reset status here - let the output render first
                } else if (data.status === 'Analysis failed') {
                  console.log(`📊 [Frontend] Analysis failed - resetting status`);
                  setAiStatus('idle');
                  setIsAnalyzing(false);
                }
              } else if (data.type === 'complete' && data.result) {
                // Handle the result
                console.log(`📊 [Frontend] Received complete result:`, {
                  success: data.result.success,
                  medicineName: data.result.medicineName,
                  hasData: !!data.result.rawAnalysis
                });
                const structuredMessage = {
                  id: (Date.now() + 1).toString(),
                  type: 'structured' as const,
                  content: '',
                  timestamp: new Date(),
                  structuredData: data.result
                };

                console.log(`📊 [Frontend] Adding structured message:`, {
                  messageId: structuredMessage.id,
                  hasStructuredData: !!structuredMessage.structuredData,
                  medicineName: structuredMessage.structuredData?.medicineName
                });

                setMessages(prev => {
                  const updatedMessages = [...prev, structuredMessage];
                  console.log(`📊 [Frontend] Updated messages count:`, updatedMessages.length);
                  console.log(`📊 [Frontend] Last message details:`, {
                    id: structuredMessage.id,
                    type: structuredMessage.type,
                    hasStructuredData: !!structuredMessage.structuredData,
                    medicineName: structuredMessage.structuredData?.medicineName
                  });
                  // Save to localStorage immediately
                  chatStorage.saveChatHistory(updatedMessages, user?.id);
                  return updatedMessages;
                });

                // Update user tokens if provided
                if (data.result.tokensRemaining !== undefined) {
                  setUserTokens(data.result.tokensRemaining);
                  await refreshUserData();
                }

                // Refresh chat history after successful analysis (async, non-blocking)
                if (user) {
                  fetchUserChatHistory().catch(error => {
                    console.error('❌ Background chat history refresh failed:', error);
                    // Don't let this affect the main flow
                  });
                }

                // Reset AI status and analyzing state after successful completion
                // Don't reset immediately - let the structured output render first
                console.log(`📊 [Frontend] Analysis complete - keeping status visible until output renders`);

              } else if (data.type === 'error') {
                // Handle error
                setAiStatus('idle');
                setIsAnalyzing(false);

                const errorMessage = {
                  id: (Date.now() + 1).toString(),
                  type: 'ai' as const,
                  content: `**Error**\n\n${data.error || 'Analysis failed. Please try again.'}`,
                  timestamp: new Date()
                };

                setMessages(prev => {
                  const updatedMessages = [...prev, errorMessage];
                  // Save to localStorage immediately
                  chatStorage.saveChatHistory(updatedMessages, user?.id);
                  return updatedMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
              console.error('Raw line that failed:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('📊 [Frontend] SSE Error:', error);
      console.error('📊 [Frontend] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      setAiStatus('idle');
      setIsAnalyzing(false);

      const errorMsg = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: 'Sorry, I encountered an error while analyzing your medicine. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => {
        const updatedMessages = [...prev, errorMsg];
        // Save to localStorage immediately
        chatStorage.saveChatHistory(updatedMessages, user?.id);
        return updatedMessages;
      });
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
    console.log(`📊 [Frontend] ===== FILE UPLOAD TRIGGERED =====`);
    const file = e.target.files?.[0];
    console.log(`📊 [Frontend] File selected:`, { fileName: file?.name, fileSize: file?.size });
    if (!file) {
      console.log(`📊 [Frontend] No file selected`);
      return;
    }

    // Check authentication before proceeding
    console.log(`📊 [Frontend] Checking authentication...`);
    if (!checkAuthentication()) {
      console.log(`📊 [Frontend] Authentication failed - resetting file input`);
      // Reset the file input
      e.target.value = '';
      return;
    }
    console.log(`📊 [Frontend] Authentication passed - proceeding with file upload`);

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
      console.log(`📊 [Frontend] FileReader loaded - calling analyzeMedicineImageWithRealStatus`);
      const imageBase64 = reader.result as string;
      // Always use real status updates from AI processing
      analyzeMedicineImageWithRealStatus(imageBase64);
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
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Still loading? Click to refresh
          </button>
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
          <button className="new-chat-header-btn" onClick={handleNewChat}>
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
                    <div
                      key={scan.id}
                      className="chat-item"
                      onClick={() => {
                        // Load previous conversation
                        const previousMessage = {
                          id: `history-${scan.id}`,
                          type: 'user' as const,
                          content: 'Previous medicine analysis',
                          image: scan.image_url,
                          timestamp: new Date(scan.created_at)
                        };

                        const aiResponse = {
                          id: `ai-history-${scan.id}`,
                          type: 'ai' as const,
                          content: 'Medicine Analysis Complete',
                          structuredData: {
                            medicine: scan.medicine_name || 'Unknown Medicine',
                            genericName: scan.generic_name || '',
                            purpose: 'Previous analysis result',
                            packagingDetected: 'Previously analyzed medicine',
                            confidence: scan.confidence || 0.85,
                            disclaimer: 'This information is for educational purposes only. Consult a healthcare professional before use.'
                          },
                          dosage: scan.dosage ? {
                            title: 'Dosage & Administration',
                            content: scan.dosage,
                            details: [scan.dosage]
                          } : undefined,
                          sideEffects: scan.side_effects && scan.side_effects.length > 0 ? {
                            title: 'Potential Side Effects',
                            content: Array.isArray(scan.side_effects) ? scan.side_effects.join('. ') : scan.side_effects,
                            details: Array.isArray(scan.side_effects) ? scan.side_effects : [scan.side_effects]
                          } : undefined,
                          interactions: scan.interactions && scan.interactions.length > 0 ? {
                            title: 'Key Drug Interactions',
                            content: Array.isArray(scan.interactions) ? scan.interactions.join('. ') : scan.interactions,
                            details: Array.isArray(scan.interactions) ? scan.interactions : [scan.interactions]
                          } : undefined,
                          warnings: scan.warnings && scan.warnings.length > 0 ? {
                            title: 'Warnings & Contraindications',
                            content: Array.isArray(scan.warnings) ? scan.warnings.join('. ') : scan.warnings,
                            details: Array.isArray(scan.warnings) ? scan.warnings : [scan.warnings]
                          } : undefined,
                          timestamp: new Date(scan.created_at)
                        };

                        setMessages([previousMessage, aiResponse]);
                      }}
                    >
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
                    <p>No chat yet</p>
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

            {/* Real Status Updates Toggle */}
            <div className="status-toggle" style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#888'
            }}>
              <div style={{ marginBottom: '4px' }}>Status Updates:</div>
              <button
                onClick={() => setUseRealStatusUpdates(!useRealStatusUpdates)}
                style={{
                  background: useRealStatusUpdates ? '#00d4ff' : 'rgba(255, 255, 255, 0.1)',
                  color: useRealStatusUpdates ? '#000' : '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  width: '100%'
                }}
              >
                {useRealStatusUpdates ? 'Real-time' : 'Simulated'}
              </button>
            </div>

            {/* Chat Storage Info */}
            <div className="storage-info" style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#888'
            }}>
              <div>💾 Chat saved locally</div>
              <button
                onClick={() => {
                  chatStorage.clearChatHistory();
                  setMessages([{
                    id: '1',
                    type: 'ai',
                    content: getWelcomeMessage('English'),
                    timestamp: new Date()
                  }]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '10px',
                  textDecoration: 'underline',
                  marginTop: '4px'
                }}
              >
                Clear chat history
              </button>
            </div>

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
                      <div style={{background: 'red', color: 'white', padding: '10px'}}>
                        TEST: StructuredMedicineReply should render here
                      </div>
                      <StructuredMedicineReply
                        response={message.structuredData}
                        onRender={() => {
                          // Hide status after structured message is fully rendered
                          console.log(`📊 [Frontend] Structured output rendered - hiding status`);
                          setAiStatus('idle');
                          setIsAnalyzing(false);
                        }}
                      />
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
                      {/* Display raw analysis text for AI messages */}
                      {message.type === 'ai' && message.rawAnalysis && (
                        <div className="raw-analysis-text" style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {message.rawAnalysis}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Simple share icon at bottom of chat */}
                {(message.type === 'ai' || message.type === 'structured') && message.id !== '1' && (
                  <div className="share-icon-container" style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '8px',
                    marginLeft: '50px' // Align with message content
                  }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      onClick={() => shareToWhatsApp(message.rawAnalysis || message.content)}
                      style={{
                        opacity: 0.7,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s ease',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                      }}
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16,6 12,2 8,6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
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
              placeholder="Enter allergies (e.g., penicillin, sulfa drugs)"
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
