// Test Auto-Deploy - 11:34 PM +08, Sept 28

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { 
  translateMedicineAnalysis, 
  translateUIText, 
  SUPPORTED_LANGUAGES, 
  LANGUAGE_CODES,
  getLanguageCode,
  getLanguageFromCode 
} from '@/lib/translation-service';

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
      'English': 'Hi👋, how can i help you today?',
      'Chinese': '你好👋，今天我能为您做什么？',
      'Malay': 'Hai👋, bagaimana saya boleh membantu anda hari ini?',
      'Indonesian': 'Hai👋, bagaimana saya bisa membantu Anda hari ini?',
      'Thai': 'สวัสดี👋 วันนี้ฉันสามารถช่วยคุณได้อย่างไร?',
      'Vietnamese': 'Xin chào👋, hôm nay tôi có thể giúp gì cho bạn?',
      'Tagalog': 'Kumusta👋, paano ko kayo matutulungan ngayong araw?',
      'Burmese': 'မင်္ဂလာပါ👋 ဒီနေ့ ဘယ်လိုကူညီနိုင်မလဲ?',
      'Khmer': 'សួស្តី👋 ថ្ងៃនេះ ខ្ញុំអាចជួយអ្នកបានយ៉ាងណា?',
      'Lao': 'ສະບາຍດີ👋 ມື້ນີ້ ຂ້ອຍສາມາດຊ່ວຍເຈົ້າໄດ້ແນວໃດ?'
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

  // Get rotating prompt suggestions
  const getPromptSuggestions = (): string[] => {
    const suggestions: { [key: string]: string[] } = {
      'English': [
        'Can I take paracetamol with coffee?',
        'What happens if I take medicine after drinking alcohol?',
        'Can I eat durian with my medicine?',
        'What medicine should I avoid before surgery?'
      ],
      'Chinese': [
        '我可以和咖啡一起服用扑热息痛吗？',
        '喝酒后服药会怎样？',
        '我可以和榴莲一起吃药吗？',
        '手术前应该避免什么药物？'
      ],
      'Malay': [
        'Bolehkah saya ambil paracetamol dengan kopi?',
        'Apa yang berlaku jika saya ambil ubat selepas minum alkohol?',
        'Bolehkah saya makan durian dengan ubat saya?',
        'Ubat apa yang patut saya elakkan sebelum pembedahan?'
      ],
      'Indonesian': [
        'Bisakah saya minum parasetamol dengan kopi?',
        'Apa yang terjadi jika saya minum obat setelah minum alkohol?',
        'Bisakah saya makan durian dengan obat saya?',
        'Obat apa yang harus saya hindari sebelum operasi?'
      ]
    };
    
    const langSuggestions = suggestions[language] || suggestions['English'];
    return langSuggestions.slice(currentPromptIndex, currentPromptIndex + 1); // Show only 1 suggestion
  };

  // Handle prompt suggestion click
  const handlePromptSuggestion = (suggestion: string) => {
    setInputText(suggestion);
    // Auto-submit the suggestion
    handleTextSubmit(suggestion);
  };

  // Get localized placeholder text
  const getPlaceholderText = (lang: string) => {
    const placeholders = {
      'English': "Ask in English...",
      'Chinese': "用中文提问...",
      'Malay': "Tanya dalam Bahasa Melayu...",
      'Indonesian': "Tanya dalam Bahasa Indonesia...",
      'Thai': "ถามเป็นภาษาไทย...",
      'Vietnamese': "Hỏi bằng tiếng Việt...",
      'Tagalog': "Magtanong sa Filipino...",
      'Burmese': "မြန်မာဘာသာဖြင့်မေးပါ...",
      'Khmer': "សួរជាភាសាខ្មែរ...",
      'Lao': "ຖາມເປັນພາສາລາວ..."
    };
    return placeholders[lang as keyof typeof placeholders] || placeholders['English'];
  };

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [language, setLanguage] = useState('English');

  // Translation functions
  const translateMessage = (message: ChatMessage): ChatMessage => {
    if (language === 'English' || !message.content) {
      return message;
    }
    
    return {
      ...message,
      content: translateMedicineAnalysis(message.content, language)
    };
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    
    // Translate all existing messages
    setMessages(prevMessages => 
      prevMessages.map(translateMessage)
    );
    
    // Save language preference to localStorage
    localStorage.setItem('userLanguagePreference', newLanguage);
  };
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allergy, setAllergy] = useState('');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatHistoryPage, setChatHistoryPage] = useState(1);
  const [hasMoreChatHistory, setHasMoreChatHistory] = useState(true);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [userTokens, setUserTokens] = useState<number>(user?.tokens || 0);
  const [inputText, setInputText] = useState('');
  const [aiStatus, setAiStatus] = useState<string>('idle');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: getWelcomeMessage('English'),
      timestamp: new Date()
    }
  ]);

  // Helper function for smart time display
  const getSmartTimeDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  // Helper function to get conversation category/tags
  const getConversationTags = (conversation: any): string[] => {
    const tags: string[] = [];
    
    if (conversation.medicineName) {
      tags.push('Medicine');
    }
    
    if (conversation.firstUserMessage) {
      const message = conversation.firstUserMessage.toLowerCase();
      if (message.includes('interaction') || message.includes('coffee') || message.includes('alcohol') || message.includes('food')) {
        tags.push('Interaction');
      }
      if (message.includes('dosage') || message.includes('dose') || message.includes('take')) {
        tags.push('Dosage');
      }
      if (message.includes('side effect') || message.includes('allergy')) {
        tags.push('Safety');
      }
    }
    
    if (conversation.imageUrl) {
      tags.push('Photo');
    }
    
    return tags.length > 0 ? tags : ['General'];
  };

  // Rotate prompt suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromptIndex((prev) => {
        const suggestions: { [key: string]: string[] } = {
          'English': [
            'Can I take paracetamol with coffee?',
            'What happens if I take medicine after drinking alcohol?',
            'Can I eat durian with my medicine?',
            'What medicine should I avoid before surgery?'
          ],
          'Chinese': [
            '我可以和咖啡一起服用扑热息痛吗？',
            '喝酒后吃药会怎样？',
            '我可以和榴莲一起吃药吗？',
            '手术前应该避免什么药物？'
          ],
          'Malay': [
            'Bolehkah saya ambil paracetamol dengan kopi?',
            'Apa yang berlaku jika saya ambil ubat selepas minum arak?',
            'Bolehkah saya makan durian dengan ubat saya?',
            'Ubat apa yang patut saya elakkan sebelum pembedahan?'
          ],
          'Indonesian': [
            'Bisakah saya minum paracetamol dengan kopi?',
            'Apa yang terjadi jika saya minum obat setelah minum alkohol?',
            'Bisakah saya makan durian dengan obat saya?',
            'Obat apa yang harus saya hindari sebelum operasi?'
          ]
        };
        const langSuggestions = suggestions[language] || suggestions['English'];
        const maxIndex = langSuggestions.length - 1;
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [language]);

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
        
        // Auto-scroll to show the error message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
      return false;
    }

    return true;
  };

  // Handle text input submission - AI Pharmacist
  const handleTextSubmit = async (textInput?: string) => {
    const userMessage = (textInput || inputText).trim();
    if (!userMessage) return;

    // Check basic authentication (user exists) but NOT tokens yet
    if (!user) {
      setShowRegistrationModal(true);
      return;
    }

    // Clear input if using the input field
    if (!textInput) {
      setInputText('');
    }

    // Add user message to chat
    const newUserMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };

    // Show AI thinking animation
    setIsAiThinking(true);

    setMessages(prev => [...prev, newUserMessage]);
    setIsAnalyzing(true);

    const userId = user?.id ?? '';

    // CRITICAL VALIDATION: Keep this check and add a user-facing error message
    if (!userId) {
      setIsAnalyzing(false);
      setIsAiThinking(false);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "⚠️ **Authentication Required**\n\nAuthentication required. Please log in to use AI analysis.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }


    // Construct payload for AI Pharmacist API with current medication stack
    const payload = {
      userMessage: userMessage,
      userId: userId,
      language: language,
      userContext: {
        currentMedications: [],
        allergies: allergy ? [allergy] : [],
        medicalConditions: [] // TODO: Load from user profile
      }
    };

    try {
      console.log('🔍 [FRONTEND DEBUG] Making API call to /api/ai-pharmacist');
      console.log('🔍 [FRONTEND DEBUG] Request payload:', {
        userMessage,
        userId,
        language,
        userContext: payload.userContext ? 'present' : 'missing'
      });
      const response = await fetch('/api/ai-pharmacist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('🔍 [FRONTEND DEBUG] API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();

      if (response.status === 200 && result.status === 'SUCCESS') {
        // Create comprehensive AI pharmacist response with all information
        let fullResponse = result.data?.message || result.data?.pharmacistAdvice || 'AI Pharmacist consultation complete';
        
        // Add structured medicine information if available
        if (result.data && result.data.medicineName) {
          fullResponse += `\n\n**Medicine Information:**`;
          fullResponse += `\n• **Medicine**: ${result.data.medicineName}`;
          
          if (result.data.genericName) {
            fullResponse += `\n• **Generic Name**: ${result.data.genericName}`;
          }
          
          if (result.data.activeIngredients) {
            fullResponse += `\n• **Active Ingredients**: ${result.data.activeIngredients}`;
          }
          
          if (result.data.dosageInstructions) {
            fullResponse += `\n\n**Dosage Instructions:**`;
            fullResponse += `\n${result.data.dosageInstructions}`;
          }
          
          if (result.data.sideEffects && result.data.sideEffects.length > 0) {
            fullResponse += `\n\n**Side Effects:**`;
            result.data.sideEffects.forEach((effect: string) => {
              fullResponse += `\n• ${effect}`;
            });
          }
          
          if (result.data.drugInteractions) {
            fullResponse += `\n\n**Drug Interactions:**`;
            fullResponse += `\n${result.data.drugInteractions}`;
          }
          
          if (result.data.safetyNotes) {
            fullResponse += `\n\n**Safety Notes:**`;
            fullResponse += `\n${result.data.safetyNotes}`;
          }
          
          if (result.data.storage) {
            fullResponse += `\n\n**Storage Instructions:**`;
            fullResponse += `\n${result.data.storage}`;
          }
          
          if (result.data.purpose) {
            fullResponse += `\n\n**Purpose:**`;
            fullResponse += `\n${result.data.purpose}`;
          }
          
          if (result.data.disclaimer) {
            fullResponse += `\n\n**Important Reminder:**`;
            fullResponse += `\n${result.data.disclaimer}`;
          }
        }

        // Add single comprehensive AI message
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: fullResponse,
          timestamp: new Date()
        };

        // Hide AI thinking animation and add AI response
        setIsAiThinking(false);
        setMessages(prev => [...prev, aiMessage]);
        
        // Auto-scroll to show the new AI message
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Update user tokens
        if (result.tokensRemaining !== undefined) {
          setUserTokens(result.tokensRemaining);
          // Note: refreshUserData removed to prevent race condition
          console.log('⚠️ Tokens updated but skipping refreshUserData to prevent race condition');
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
          // Note: refreshUserData removed to prevent race condition
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
      setIsAiThinking(false);
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
    // Check if there's an actual conversation to save (more than just the welcome message)
    const hasConversation = messages.length > 1 || 
      (messages.length === 1 && messages[0].type === 'user');
    
    // Create fresh welcome message first
    const freshWelcomeMessage = {
      id: '1',
      type: 'ai' as const,
      content: getWelcomeMessage(language),
      timestamp: new Date()
    };
    
    // Save current conversation before clearing if there's actual conversation
    if (hasConversation) {
      console.log('💾 Saving current conversation before starting new chat...');
      chatStorage.saveChatHistory(messages, user?.id);
    }
    
    // Clear localStorage for current session to prevent reloading old conversation
    chatStorage.saveChatHistory([freshWelcomeMessage], user?.id);
    
    // Clear current session and start fresh
    setMessages([freshWelcomeMessage]);
    setSideNavOpen(false); // Close side nav after starting new chat
    
    // REMOVED: fetchUserChatHistory call that was overwriting messages after new chat
    // The fresh welcome message is already set above and saved to localStorage
    // This prevents the file upload functionality from breaking
    
    console.log('✅ New chat started successfully');
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
    console.log('🔍 MAIN PAGE: User state changed', {
      timestamp: new Date().toISOString(),
      hasUser: !!user,
      userId: user?.id || 'null',
      userEmail: user?.email || 'null',
      userTokens: user?.tokens || 'null',
      userName: user?.name || 'null'
    });

    // Update local token state when user changes
    if (user?.tokens !== undefined) {
      setUserTokens(user.tokens);
    }

    // CRITICAL: If user is authenticated but missing tokens or referral code, refresh data
    if (user && !isLoading) {
      if (user.tokens === 0 || !user.referral_code) {
        // Note: refreshUserData removed to prevent race condition
        console.log('⚠️ User has low tokens or missing referral code, but skipping refreshUserData to prevent race condition');
      }
    }
  }, [user, isLoading]); // Removed refreshUserData to prevent race condition

  // Load user language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('userLanguagePreference');
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Translate messages when language changes
  useEffect(() => {
    if (language !== 'English' && messages.length > 0) {
      setMessages(prevMessages => 
        prevMessages.map(translateMessage)
      );
    }
  }, [language]);

  // Enhanced function to fetch user chat history with pagination and search
  const fetchUserChatHistory = useCallback(async (page: number = 1, searchQuery: string = '', append: boolean = false) => {
    if (!user?.id) {
      // For non-authenticated users, load from localStorage only
      const localMessages = chatStorage.loadChatHistory();
      if (localMessages.length > 0) {
        console.log('✅ Chat history loaded from localStorage (guest):', localMessages.length, 'messages');
        setMessages(localMessages);
      }
      return;
    }

    setChatHistoryLoading(true);
    try {
      console.log('🔍 [FRONTEND] Fetching chat history from database API...');
      
      // Fetch from new API endpoint
      const response = await fetch(`/api/chat-history?userId=${user.id}&page=${page}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.conversations && data.conversations.length > 0) {
        console.log('✅ Chat history loaded from database API:', data.conversations.length, 'conversations');
        
        if (append) {
          setChatHistory(prev => [...prev, ...data.conversations]);
        } else {
          setChatHistory(data.conversations);
        }
        
        // Update pagination state
        setHasMoreChatHistory(page < data.pagination.totalPages);
        setChatHistoryPage(page);
        
        console.log('✅ Chat history loaded: page', page, ',', data.conversations.length, 'conversations');
        console.log('📊 Pagination info:', data.pagination);
      } else {
        console.log('ℹ️ No chat history found in database');
        if (!append) {
          setChatHistory([]);
        }
        setHasMoreChatHistory(false);
      }

      // Also load current conversation from localStorage for immediate display
      const localMessages = chatStorage.loadChatHistory(user.id);
      if (localMessages.length > 0 && page === 1) {
        setMessages(localMessages);
      }

    } catch (error) {
      console.error('❌ Failed to fetch chat history:', error);
      setChatHistory([]);
    } finally {
      setChatHistoryLoading(false);
    }
  }, [user?.id]);

  // Helper function to group messages by session into conversation thumbnails
  const groupMessagesBySession = (messages: any[]) => {
    const sessionMap = new Map();
    
    messages.forEach(msg => {
      const sessionId = msg.session_id || msg.id;
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          id: sessionId,
          sessionId: sessionId,
          messages: [],
          createdAt: msg.created_at,
          medicineName: msg.medicine_name,
          genericName: msg.generic_name,
          imageUrl: msg.image_url,
          messageCount: 0,
          firstUserMessage: '',
          lastAiMessage: ''
        });
      }
      
      const conversation = sessionMap.get(sessionId);
      conversation.messages.push(msg);
      conversation.messageCount++;
      
      // Store first user message and last AI message for preview
      if (msg.message_type === 'user' && !conversation.firstUserMessage) {
        conversation.firstUserMessage = msg.message_text;
      }
      if (msg.message_type === 'ai') {
        conversation.lastAiMessage = msg.ai_response || msg.message_text;
      }
      
      // Update creation time to earliest message
      if (new Date(msg.created_at) < new Date(conversation.createdAt)) {
        conversation.createdAt = msg.created_at;
      }
    });

    return Array.from(sessionMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // Load chat history on initial page load (before user authentication)
  useEffect(() => {
    // Load from localStorage immediately for instant display
    const localMessages = chatStorage.loadChatHistory();
    if (localMessages.length > 0) {
      setMessages(localMessages);
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [messages, scrollToBottom]);

  // Update greeting message when language changes
  useEffect(() => {
    if (messages.length > 0 && messages[0].type === 'ai' && messages[0].id === '1') {
      setMessages(prev => [
        {
          ...prev[0],
          content: getWelcomeMessage(language)
        },
        ...prev.slice(1)
      ]);
    }
  }, [language]);

  // Reset prompt suggestions when language changes
  useEffect(() => {
    setCurrentPromptIndex(0);
  }, [language]);

  // Medication Stack Management Functions

  // Fetch user chat history when user logs in
  useEffect(() => {
    if (user?.id) {
      fetchUserChatHistory(1, chatSearchQuery, false);
    }
  }, [fetchUserChatHistory, user?.id, chatSearchQuery]);

  // Load more chat history when scrolling
  const loadMoreChatHistory = useCallback(() => {
    if (!chatHistoryLoading && hasMoreChatHistory && user?.id) {
      const nextPage = chatHistoryPage + 1;
      setChatHistoryPage(nextPage);
      fetchUserChatHistory(nextPage, chatSearchQuery, true);
    }
  }, [chatHistoryLoading, hasMoreChatHistory, user?.id, chatHistoryPage, chatSearchQuery, fetchUserChatHistory]);




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
        console.log(`📊 [Frontend] Camera photo loaded`);
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
        console.log(`📊 [Frontend] Starting image analysis`);
    
    // Check basic authentication (user exists) but NOT tokens yet
    if (!user) {
      console.log(`📊 [Frontend] No user - showing registration modal`);
      setShowRegistrationModal(true);
      return;
    }
    console.log(`📊 [Frontend] User authenticated - proceeding with analysis`);

    setIsAnalyzing(true);
    
    // Get localized AI status message
    const getAiStatusMessage = (lang: string) => {
      const messages = {
        'English': 'Initializing AI...',
        'Chinese': '正在初始化AI...',
        'Malay': 'Memulakan AI...',
        'Indonesian': 'Menginisialisasi AI...'
      };
      return messages[lang as keyof typeof messages] || messages['English'];
    };
    
    setAiStatus(getAiStatusMessage(language));

    // Create localized user message
    const getUploadMessage = (lang: string) => {
      const messages = {
        'English': "I've uploaded an image of a medicine for identification.",
        'Chinese': "我已上传药品图片进行识别。",
        'Malay': "Saya telah memuat naik imej ubat untuk pengenalan.",
        'Indonesian': "Saya telah mengunggah gambar obat untuk identifikasi."
      };
      return messages[lang as keyof typeof messages] || messages['English'];
    };

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: getUploadMessage(language),
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
          language: language, // Use current language state instead of hardcoded 'English'
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
        const { done, value } = await reader.read();
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
                
                // CRITICAL FIX: Force AI status to disappear immediately after receiving complete data
                console.log(`📊 [Frontend] FORCING AI status to disappear after receiving complete data`);
                setAiStatus('idle');
                setIsAnalyzing(false);
                
                // REMOVED: fetchUserChatHistory call that was overwriting the current messages
                // The AI message will be added directly below and saved to localStorage
                
                // DIRECT APPROACH: Add AI message with rawAnalysis content directly to chat
                const rawContent = data.result.rawAnalysis || 'Medicine analysis completed successfully.';
                const translatedContent = translateMedicineAnalysis(rawContent, language);
                
                const aiMessage = {
                  id: (Date.now() + 1).toString(),
                  type: 'ai' as const,
                  content: translatedContent,
                  timestamp: new Date()
                };

                console.log(`📊 [Frontend] Adding direct AI message:`, {
                  messageId: aiMessage.id,
                  type: aiMessage.type,
                  contentLength: aiMessage.content.length,
                  medicineName: data.result.medicineName
                });

                setMessages(prev => {
                  const updatedMessages = [...prev, aiMessage];
                  // Save to localStorage immediately
                  chatStorage.saveChatHistory(updatedMessages, user?.id);
                  return updatedMessages;
                });

                // Auto-scroll to show the new AI message
                setTimeout(() => {
                  scrollToBottom();
                }, 100);

                // Update user tokens if provided (non-blocking)
                if (data.result.tokensRemaining !== undefined) {
                  setUserTokens(data.result.tokensRemaining);
                  // Note: refreshUserData removed to prevent race condition
                  console.log('⚠️ Tokens updated but skipping refreshUserData to prevent race condition');
                }

                // Note: fetchUserChatHistory() removed to prevent overwriting newly added AI message
                // The AI message is already saved to localStorage via chatStorage.saveChatHistory()

                console.log(`📊 [Frontend] Analysis complete - AI status forced to disappear`);
                
                // REMOVED: Another fetchUserChatHistory call that was overwriting messages
                // The AI message is already added and saved to localStorage above

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
      console.log(`📊 [Frontend] File upload triggered`);
      const file = e.target.files?.[0];
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
      console.log(`📊 [Frontend] FileReader loaded`);
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
            onChange={(e) => handleLanguageChange(e.target.value)}
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
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {isMobile ? LANGUAGE_CODES[lang as keyof typeof LANGUAGE_CODES] : lang}
              </option>
            ))}
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
            {/* Enhanced Chat History with Search */}
            <div className="recent-chats">
              <div className="chat-history-header">
                <h3>Chat History</h3>
                {user && (
                  <div className="chat-search">
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="chat-search-input"
                    />
                  </div>
                )}
              </div>
              
              <div className="chat-list" onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (scrollHeight - scrollTop <= clientHeight + 100) {
                  loadMoreChatHistory();
                }
              }}>
                {chatHistory.length > 0 ? (
                  chatHistory.map((conversation, index) => (
                    <div
                      key={conversation.id}
                      className="chat-item enhanced"
                      onClick={() => {
                        // Load previous conversation
                        const conversationMessages = conversation.messages
                          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                          .map((msg: any) => ({
                            id: msg.id,
                            type: msg.message_type as 'user' | 'ai',
                            content: msg.message_type === 'user' ? msg.message_text : (msg.ai_response || msg.message_text),
                            timestamp: new Date(msg.created_at),
                            image: msg.image_url || undefined,
                            structuredData: msg.message_type === 'ai' && conversation.medicineName ? {
                              medicine_name: conversation.medicineName,
                              generic_name: conversation.genericName,
                              purpose: 'Previous analysis',
                              raw_analysis: msg.ai_response || msg.message_text
                            } : undefined
                          }));

                        setMessages(conversationMessages);
                        setSideNavOpen(false);
                      }}
                    >
                      <div className="chat-item-icon">
                        {conversation.imageUrl ? (
                          <img src={conversation.imageUrl} alt="Medicine" className="chat-medicine-thumbnail" />
                        ) : (
                          <div className="chat-icon-placeholder">
                            {conversation.medicineName ? '💊' : '💬'}
                          </div>
                        )}
                      </div>
                      
                      <div className="chat-item-content">
                        <div className="chat-item-title">
                          {conversation.title || 'AI Chat'}
                        </div>
                        <div className="chat-item-preview">
                          {conversation.thumbnail || 'Conversation with AI Pharmacist'}
                        </div>
                        {/* Removed date and tags from UI as requested - data still stored in database */}
                      </div>
                    </div>
                  ))
                ) : chatHistoryLoading ? (
                  <div className="chat-list-loading">
                    <span>Loading chat history...</span>
                  </div>
                ) : (
                  <div className="no-scans">
                    <p>No chat yet</p>
                    <p className="scan-hint">Start a conversation with AI Pharmacist</p>
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
        <div className="chat-window" ref={chatWindowRef}>
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

                  {/* Direct AI message rendering - no complex structured logic needed */}
                  {message.type === 'ai' && message.content ? (
                    <div className="ai-response">
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
                      {/* Share button inside AI chat bubble at bottom right (except greeting message) */}
                      {message.id !== '1' && (
                        <div className="message-share-internal">
                          <Share2 
                            size={14}
                            onClick={() => shareToWhatsApp(message.content)}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              color: '#00d4ff'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.1)';
                              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.background = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : message.type === 'structured' && message.structuredData ? (
                    <div className="structured-medicine-response">
                      <StructuredMedicineReply
                        response={message.structuredData}
                        onRender={() => {
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
                
                {/* Timestamp for AI messages at bottom right (except greeting message) */}
                {message.type === 'ai' && message.id !== '1' && (
                  <div className="message-timestamp-external timestamp-bottom-right">
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                )}
                
                {/* Timestamp for user messages at bottom left */}
                {message.type === 'user' && (
                  <div className="message-timestamp-external timestamp-bottom-left">
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                )}
                
              </div>
            ))}

          {/* AI Thinking Animation for Text Queries */}
          {isAiThinking && (
            <AIStatusDisplay status={
              language === 'English' ? 'AI Pharmacist is analyzing...' :
              language === 'Chinese' ? 'AI药剂师正在分析...' :
              language === 'Malay' ? 'AI Farmasi sedang menganalisis...' :
              language === 'Indonesian' ? 'AI Apoteker sedang menganalisis...' :
              language === 'Thai' ? 'AI เภสัชกรกำลังวิเคราะห์...' :
              language === 'Vietnamese' ? 'AI Dược sĩ đang phân tích...' :
              'AI Pharmacist is analyzing...'
            } />
          )}

          {isAnalyzing && (
            <AIStatusDisplay key={`${isAnalyzing}-${aiStatus}`} status={aiStatus} />
          )}
          </div>

          <div className="input-container">
            {/* Rotating Prompt Suggestions - Replaces Allergy Input */}
            <div className="allergy-input-wrapper">
              <div className="prompt-suggestion-container">
                <div 
                  className="prompt-suggestion-display"
                  onClick={() => {
                    const currentSuggestions = getPromptSuggestions();
                    if (currentSuggestions.length > 0) {
                      handlePromptSuggestion(currentSuggestions[0]);
                    }
                  }}
                >
                  {getPromptSuggestions()[0] || 'Can I take paracetamol with coffee?'}
                </div>
              </div>
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
                  placeholder={getPlaceholderText(language)}
                  className="text-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button
                  className="send-btn"
                  onClick={() => handleTextSubmit()}
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
