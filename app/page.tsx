'use client';

import { useState, useEffect, createContext, useMemo, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
import { Bot, User, Send, Upload, Camera, Menu, X, Plus, MessageSquare, Settings, LogOut, LogIn } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './globals.css';

const LanguageContext = createContext({ language: 'English', setLanguage: (_lang: string) => {} });

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  image?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [tokens, setTokens] = useState(100);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [allergy, setAllergy] = useState('');

  // Chat window ref for auto-scroll
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Mobile language abbreviations
  const getLanguageDisplayText = (lang: string, isMobile: boolean) => {
    if (!isMobile) return lang;
    
    const abbreviations: { [key: string]: string } = {
      'English': 'EN',
      'Chinese': '中文',
      'Malay': 'MS',
      'Indonesian': 'ID',
      'Thai': 'TH',
      'Vietnamese': 'VN',
      'Tagalog': 'TL',
      'Burmese': 'MM',
      'Khmer': 'KH',
      'Lao': 'LA'
    };
    
    return abbreviations[lang] || lang;
  };

  const languagePlaceholders: { [key: string]: string } = {
    'English': 'Ask in English...',
    'Chinese': '用中文询问...',
    'Malay': 'Tanya dalam Bahasa Melayu...',
    'Indonesian': 'Tanya dalam Bahasa Indonesia...',
    'Thai': 'ถามเป็นภาษาไทย...',
    'Vietnamese': 'Hỏi bằng tiếng Việt...',
    'Tagalog': 'Magtanong sa Tagalog...',
    'Burmese': 'မြန်မာဘာသာဖြင့် မေးမြန်းပါ...',
    'Khmer': 'សួរជាភាសាខ្មែរ...',
    'Lao': 'ຖາມເປັນພາສາລາວ...'
  };

  const imageUploadMessages: { [key: string]: string } = {
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

  const cameraCaptureMessages: { [key: string]: string } = {
    'English': 'I\'ve captured a photo of a medicine for identification.',
    'Chinese': '我已拍摄药品照片进行识别。',
    'Malay': 'Saya telah mengambil gambar ubat untuk pengenalan.',
    'Indonesian': 'Saya telah memotret obat untuk identifikasi.',
    'Thai': 'ฉันได้ถ่ายภาพยาสำหรับการระบุตัวตน',
    'Vietnamese': 'Tôi đã chụp ảnh thuốc để nhận dạng.',
    'Tagalog': 'Kumuha ako ng litrato ng gamot para sa pagkilala.',
    'Burmese': 'ဆေးဝါးများကို ခွဲခြားသိမြင်ရန် ဓာတ်ပုံတစ်ပုံကို ရိုက်ယူပြီးပါပြီ။',
    'Khmer': 'ខ្ញុំបានថតរូបថ្នាំសម្រាប់ការកំណត់អត្តសញ្ញាណ។',
    'Lao': 'ຂ້ອຍໄດ້ຖ່າຍຮູບຢາເພື່ອການກວດສອບແລະກຳນົດຕົວຕົນ.'
  };

  const allergyPlaceholders: { [key: string]: string } = {
    'English': 'Enter allergies (e.g., penicillin, paracetamol)',
    'Chinese': '输入过敏史（例如：青霉素、扑热息痛）',
    'Malay': 'Masukkan alahan (cth., penicillin, paracetamol)',
    'Indonesian': 'Masukkan alergi (mis., penisilin, parasetamol)',
    'Thai': 'ใส่ข้อมูลการแพ้ (เช่น เพนิซิลลิน พาราเซตามอล)',
    'Vietnamese': 'Nhập dị ứng (vd., penicillin, paracetamol)',
    'Tagalog': 'Ilagay ang mga allergy (hal., penicillin, paracetamol)',
    'Burmese': 'ဓာတ်မတည့်မှုများ ထည့်သွင်းပါ (ဥပမာ- ပန်န်နီစလင်၊ ပါရာစီတမော)',
    'Khmer': 'បញ្ចូលរោគអាឡែន (ឧទាហរណ៍ ពេនីស៊ីលីន ប៉ារ៉ាស៊ីតាម៉ុល)',
    'Lao': 'ປ້ອນການແພ້ (ຕົວຢ່າງ: penicillin, paracetamol)'
  };

  const welcomeMessages: { [key: string]: string } = useMemo(() => ({
    'English': 'Start this conversation by taking your medicine photo.',
    'Chinese': '请拍摄您的药品照片来开始这次对话。',
    'Malay': 'Mulakan perbualan ini dengan mengambil foto ubat anda.',
    'Indonesian': 'Mulai percakapan ini dengan mengambil foto obat Anda.',
    'Thai': 'เริ่มการสนทนานี้โดยถ่ายภาพยาของคุณ',
    'Vietnamese': 'Bắt đầu cuộc trò chuyện này bằng cách chụp ảnh thuốc của bạn.',
    'Tagalog': 'Simulan ang pag-uusap na ito sa pamamagitan ng pagkuha ng larawan ng inyong gamot.',
    'Burmese': 'သင့်ဆေးပုံကို ရိုက်ယူခြင်းဖြင့် ဤစကားပြောဆိုမှုကို စတင်ပါ။',
    'Khmer': 'ចាប់ផ្តើមការសន្ទនានេះដោយថតរូបថ្នាំរបស់អ្នក។',
    'Lao': 'ເລີ່ມການສົນທະນານີ້ໂດຍການຖ່າຍຮູບຢາຂອງທ່ານ.'
  }), []);

  useEffect(() => {
    // Check for saved language preference first
    const savedLanguage = localStorage.getItem('selectedLanguage');
    let initialLanguage = 'English';
    
    if (savedLanguage) {
      initialLanguage = savedLanguage;
    } else {
      // Auto-detect browser language if no preference saved
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      const langMap: { [key: string]: string } = { 
        en: 'English', zh: 'Chinese', ms: 'Malay', id: 'Indonesian', th: 'Thai', 
        vi: 'Vietnamese', tl: 'Tagalog', my: 'Burmese', km: 'Khmer', lo: 'Lao' 
      };
      initialLanguage = langMap[browserLang] || 'English';
    }
    
    setLanguage(initialLanguage);
    
    // Set welcome message immediately with the correct language
    if (messages.length === 0 && welcomeMessages[initialLanguage]) {
      console.log('Setting initial welcome message for language:', initialLanguage, 'Message:', welcomeMessages[initialLanguage]);
      setMessages([{
        id: '1',
        type: 'ai',
        content: welcomeMessages[initialLanguage],
        timestamp: new Date()
      }]);
    }

    const mobileCheck = /Android|iPhone|iPad/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;
    setIsMobile(mobileCheck);
    if (mobileCheck) setShowInstallPrompt(true);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    });

    // Add dummy recent chats for UI demonstration
    const dummyChats: Chat[] = [
      {
        id: '1',
        title: 'Medicine Identification',
        messages: [
          {
            id: '1',
            type: 'ai',
            content: 'Start this conversation by taking your medicine photo.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          },
          {
            id: '2',
            type: 'user',
            content: 'I uploaded a photo of my medicine',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000) // 2 hours ago + 5 min
          },
          {
            id: '3',
            type: 'ai',
            content: 'I can see the medicine image you\'ve uploaded. Based on the packaging and appearance, this appears to be a prescription medication.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 6 * 60 * 1000) // 2 hours ago + 6 min
          }
        ],
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: '2',
        title: 'Dosage Information',
        messages: [
          {
            id: '1',
            type: 'ai',
            content: 'Start this conversation by taking your medicine photo.',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
          },
          {
            id: '2',
            type: 'user',
            content: 'What is the recommended dosage for this medicine?',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000) // 1 day ago + 3 min
          },
          {
            id: '3',
            type: 'ai',
            content: 'For accurate dosage information, please consult with your healthcare provider or pharmacist.',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000) // 1 day ago + 4 min
          }
        ],
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        title: 'Side Effects Query',
        messages: [
          {
            id: '1',
            type: 'ai',
            content: 'Start this conversation by taking your medicine photo.',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
          },
          {
            id: '2',
            type: 'user',
            content: 'Are there any side effects I should know about?',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000) // 3 days ago + 2 min
          },
          {
            id: '3',
            type: 'ai',
            content: 'Side effects vary by individual. Please consult your doctor or pharmacist for personalized information.',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000) // 3 days ago + 3 min
          }
        ],
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: '4',
        title: 'Medicine Storage',
        messages: [
          {
            id: '1',
            type: 'ai',
            content: 'Start this conversation by taking your medicine photo.',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
          },
          {
            id: '2',
            type: 'user',
            content: 'How should I store this medicine?',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1 * 60 * 1000) // 1 week ago + 1 min
          },
          {
            id: '3',
            type: 'ai',
            content: 'Store in a cool, dry place away from direct sunlight. Check the label for specific storage instructions.',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000) // 1 week ago + 2 min
          }
        ],
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];

    const storedChats = JSON.parse(localStorage.getItem('recentChats') || '[]');
    // Convert timestamp strings back to Date objects
    const parsedChats = storedChats.map((chat: { timestamp: string; messages: Array<{ timestamp: string }> }) => ({
      ...chat,
      timestamp: new Date(chat.timestamp),
      messages: chat.messages.map((msg: { timestamp: string }) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }));
    // Use dummy chats if no stored chats exist
    setRecentChats(parsedChats.length > 0 ? parsedChats : dummyChats);
    const storedTokens = parseInt(localStorage.getItem('tokens') || '100');
    setTokens(storedTokens);
    if (localStorage.getItem('loggedIn') === 'true') setIsLoggedIn(true);

    // Welcome message is now set in the initial useEffect above
  }, [language, messages.length, welcomeMessages]);

  // Check camera availability on mount - only for mobile/tablet
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        // Check if we're on mobile/tablet
        const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Disable camera completely on desktop/laptop
        if (!isMobileDevice) {
          setCameraAvailable(false);
          return;
        }
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraAvailable(false);
          return;
        }
        
        // Check if we're on HTTPS or localhost
        const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (!isSecureContext) {
          setCameraAvailable(false);
          return;
        }
        
        // Try to enumerate devices to check if camera exists
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        setCameraAvailable(hasCamera);
      } catch (error) {
        console.log('Camera availability check failed:', error);
        setCameraAvailable(false);
      }
    };
    
    checkCameraAvailability();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatWindowRef.current) {
      const scrollToBottom = () => {
        chatWindowRef.current!.scrollTop = chatWindowRef.current!.scrollHeight;
      };
      
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);

  const handleLogin = () => {
    console.log('Login/Sign Up button clicked');
    setIsLoggedIn(true);
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('tokens', tokens.toString());
  };

  const handleLogout = () => {
    console.log('Sign Out button clicked');
    setIsLoggedIn(false);
    localStorage.removeItem('loggedIn');
  };

  const handleNewChat = () => {
    console.log('New Chat button clicked');
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      timestamp: new Date()
    };
    setRecentChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([{
      id: '1',
      type: 'ai',
      content: welcomeMessages[language] || welcomeMessages['English'],
      timestamp: new Date()
    }]);
    localStorage.setItem('recentChats', JSON.stringify([newChat, ...recentChats]));
  };

  const handleChatClick = (chatId: string) => {
    console.log('Recent chat clicked:', chatId);
    const chat = recentChats.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    console.log('Send button clicked with message:', input);
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // API call
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          language: language,
          messages: [...messages, userMessage]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Update current chat
        if (currentChatId) {
          const updatedChats = recentChats.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, userMessage, aiMessage] }
              : chat
          );
          setRecentChats(updatedChats);
          localStorage.setItem('recentChats', JSON.stringify(updatedChats));
        }
      } else {
        // Fallback mock response
        setTimeout(() => {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: `AI Response in ${language}: I understand your message about "${input}". This is a mock response. Please upload a medicine photo for better assistance.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        }, 500);
      }
    } catch (error) {
      console.log('API call failed, using mock response:', error);
      // Mock AI response with delay
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `AI Response in ${language}: I understand your message about "${input}". This is a mock response. Please upload a medicine photo for better assistance.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }, 500);
    }
    
    setIsLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Image upload triggered');
    const file = e.target.files?.[0];
    if (!file) return;

    // Check tokens
    if (tokens <= 0) {
      alert('No tokens left! Please subscribe for more scans.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please select an image smaller than 10MB.');
      return;
    }

    // Show loading state
    setIsLoading(true);

      const reader = new FileReader();
    reader.onload = async (event) => {
      const imageBase64 = event.target?.result as string;
      
        const imageMessage: Message = {
          id: Date.now().toString(),
          type: 'user',
          content: imageUploadMessages[language] || imageUploadMessages['English'],
          timestamp: new Date(),
          image: imageBase64
        };
        setMessages(prev => [...prev, imageMessage]);
        
      try {
        // Call the new image analysis API
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64,
            language,
            allergy
          })
        });

        const data = await response.json();

        if (data.error) {
          // Handle non-medicine images or errors
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: `**Error: ${data.error}**

Please upload a clear photo of medicine packaging, pills, or related medical items for proper identification.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          return;
        }

        if (data.warning) {
          // Handle packaging warnings
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: `**Warning: ${data.warning}**

For accurate medicine identification and safety information, please upload a photo showing the original packaging.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          return;
        }

        if (data.success && data.analysis) {
          // Deduct token for successful analysis
          setTokens(prev => {
            const newTokens = prev - 1;
            localStorage.setItem('tokens', newTokens.toString());
            return newTokens;
          });

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: data.analysis,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        }
      } catch (error) {
        console.error('Image analysis error:', error);
        
        // Check if it's a specific API error
        let errorContent = 'Sorry, I encountered an error while analyzing the image. Please try again or contact support.';
        
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            errorContent = 'The analysis is taking too long. Please try with a smaller image or try again later.';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorContent = 'Network error. Please check your internet connection and try again.';
          } else if (error.message.includes('Invalid image')) {
            errorContent = 'The uploaded image format is not supported. Please upload a JPEG or PNG image.';
          }
        }
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `**Error:** ${errorContent}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.readAsDataURL(file);
  };


  const handleCameraCapture = async () => {
    console.log('Camera button clicked');
    setCameraLoading(true);
    
    try {
      // Check if we're on mobile/tablet
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show friendly message for desktop users
      if (!isMobileDevice) {
        const useFileUpload = confirm('Camera is available on mobile/tablet. Please use your phone.\n\nWould you like to upload a photo from your device instead?');
        if (useFileUpload) {
          const fileInput = document.getElementById('upload') as HTMLInputElement;
          if (fileInput) {
            fileInput.click();
          }
        }
        setCameraLoading(false);
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      // Check if we're on HTTPS or localhost
      const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if (!isSecureContext) {
        throw new Error('HTTPS_REQUIRED');
      }
      
      // Camera constraints - back camera only, no mirroring
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera only
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted - back camera only');
      
      setCameraStream(stream);
      setShowCamera(true);
      setCameraLoading(false);
      
      // Set video source - no mirroring
      if (videoRef) {
        videoRef.srcObject = stream;
        // Ensure no CSS transforms for mirroring
        videoRef.style.transform = 'none';
        (videoRef.style as any).webkitTransform = 'none';
        (videoRef.style as any).mozTransform = 'none';
        (videoRef.style as any).msTransform = 'none';
        videoRef.play().catch(console.error);
        console.log('Camera video element updated - no mirroring applied');
      }
    } catch (error: unknown) {
      console.log('Camera access error:', error);
      setCameraLoading(false);
      
      let errorMessage = '';
      let showFileUpload = false;
      
      if ((error as Error).name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permission in your browser settings, or use the upload button to select a photo from your device.';
        showFileUpload = true;
      } else if ((error as Error).name === 'NotFoundError') {
        errorMessage = 'No camera found on this device. Please use the upload button to select a photo from your device.';
        showFileUpload = true;
      } else if ((error as Error).message === 'HTTPS_REQUIRED') {
        errorMessage = 'Mobile camera requires HTTPS or network access. Try accessing via your computer\'s IP address (e.g., http://192.168.1.100:3000) or use the upload button.';
        showFileUpload = true;
      } else if ((error as Error).message === 'Camera not supported') {
        errorMessage = 'Camera is not supported in this browser. Please use the upload button to select a photo from your device.';
        showFileUpload = true;
      } else {
        errorMessage = 'Unable to access camera. Please use the upload button to select a photo from your device.';
        showFileUpload = true;
      }
      
      // Show error with option to upload file instead
      if (showFileUpload) {
        const useFileUpload = confirm(errorMessage + '\n\nWould you like to upload a photo from your device instead?');
        if (useFileUpload) {
          // Trigger file input
          const fileInput = document.getElementById('upload') as HTMLInputElement;
          if (fileInput) {
            fileInput.click();
          }
        }
      } else {
        alert(errorMessage);
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef || !cameraStream) {
      console.error('Camera not ready for capture');
      return;
    }
    
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas context not available');
      }
      
      // Get video dimensions
      const videoWidth = videoRef.videoWidth;
      const videoHeight = videoRef.videoHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        throw new Error('Video not ready for capture');
      }
      
      // Set canvas dimensions to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      // Draw normally - no mirroring/flipping for back camera
      // This ensures the captured image matches what the user sees in preview
      context.drawImage(videoRef, 0, 0, videoWidth, videoHeight);
      console.log('Canvas capture: Normal draw - no mirroring applied');
      
      // Convert canvas to blob with high quality
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob');
        }
        
        // Create a File object from the blob
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        
        // Convert to base64 for preview
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageBase64 = event.target?.result as string;
          
          if (!imageBase64) {
            throw new Error('Failed to read captured image');
          }
          
          // Store captured image and show preview
          setCapturedImage(imageBase64);
          setShowPreview(true);
          setShowCamera(false); // Hide camera, show preview
        };
        
        reader.onerror = () => {
          throw new Error('Failed to read captured image');
        };
        
        reader.readAsDataURL(file);
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Camera capture error:', error);
      const errorMsg = `Camera capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      alert(errorMsg);
    }
  };

  const sendCapturedImage = async () => {
    if (!capturedImage) return;
    
    // Add image message to chat
    const imageMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: cameraCaptureMessages[language] || cameraCaptureMessages['English'],
      timestamp: new Date(),
      image: capturedImage
    };
    setMessages(prev => [...prev, imageMessage]);

    // Show loading state
    setIsLoading(true);

    try {
      // Call the image analysis API
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: capturedImage,
          language,
          allergy
        })
      });

      const data = await response.json();

      if (data.error) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `**Error: ${data.error}**

Please take a clear photo of medicine packaging, pills, or related medical items for proper identification.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        return;
      }

      if (data.warning) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `**Warning: ${data.warning}**

For accurate medicine identification and safety information, please take a photo showing the original packaging.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        return;
      }

      if (data.success && data.analysis) {
        // Deduct token for successful analysis
        setTokens(prev => {
          const newTokens = prev - 1;
          localStorage.setItem('tokens', newTokens.toString());
          return newTokens;
        });

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.analysis,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while analyzing the image. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Close preview and reset
      setShowPreview(false);
      setCapturedImage(null);
    }
  };

  const retakePhoto = () => {
    setShowPreview(false);
    setCapturedImage(null);
    setShowCamera(true);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };


  const handleShareMessage = (messageContent: string) => {
    console.log('Share message button clicked');
    const shareText = `MedWira AI Analysis:\n\n${messageContent}\n\nPowered by MedWira AI`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleInstall = () => {
    console.log('Install button clicked');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      });
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    console.log('Language changed to:', newLanguage);
    setLanguage(newLanguage);
    
    // Save language preference to localStorage
    localStorage.setItem('selectedLanguage', newLanguage);
    
    // Update welcome message in current chat
    if (messages.length > 0 && messages[0].type === 'ai') {
      console.log('Updating welcome message for existing chat, new language:', newLanguage, 'Message:', welcomeMessages[newLanguage]);
      setMessages(prev => prev.map((msg, index) => 
        index === 0 ? { ...msg, content: welcomeMessages[newLanguage] || welcomeMessages['English'] } : msg
      ));
    } else if (messages.length === 0) {
      // If no messages, set the welcome message
      console.log('Setting welcome message for empty chat, new language:', newLanguage, 'Message:', welcomeMessages[newLanguage]);
      setMessages([{
        id: '1',
        type: 'ai',
        content: welcomeMessages[newLanguage] || welcomeMessages['English'],
        timestamp: new Date()
      }]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div className="app">
        {/* Install Banner */}
        {showInstallPrompt && (
          <div className="install-banner-top">
            <div className="install-content">
              <span>Add MedWira AI to your home screen!</span>
              <div className="install-actions">
                <button onClick={handleInstall}>Install</button>
                <button onClick={() => setShowInstallPrompt(false)} className="close-install">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Header */}
        <header className={`header ${showInstallPrompt ? 'with-banner' : ''}`}>
          <div className="header-left">
            <button className="burger-btn" onClick={() => setSideNavOpen(!sideNavOpen)} aria-label="Toggle menu">
              <Menu size={20} />
            </button>
            <button className="new-chat-header-btn" onClick={handleNewChat}>
              <Plus size={16} />
            </button>
            <select value={language} onChange={handleLanguageChange} className="language-select">
              <option value="English">{getLanguageDisplayText('English', isMobile)}</option>
              <option value="Chinese">{getLanguageDisplayText('Chinese', isMobile)}</option>
              <option value="Malay">{getLanguageDisplayText('Malay', isMobile)}</option>
              <option value="Indonesian">{getLanguageDisplayText('Indonesian', isMobile)}</option>
              <option value="Thai">{getLanguageDisplayText('Thai', isMobile)}</option>
              <option value="Vietnamese">{getLanguageDisplayText('Vietnamese', isMobile)}</option>
              <option value="Tagalog">{getLanguageDisplayText('Tagalog', isMobile)}</option>
              <option value="Burmese">{getLanguageDisplayText('Burmese', isMobile)}</option>
              <option value="Khmer">{getLanguageDisplayText('Khmer', isMobile)}</option>
              <option value="Lao">{getLanguageDisplayText('Lao', isMobile)}</option>
            </select>
          </div>
          
          <div className="logo">
            <Bot size={24} />
          </div>
          
          <div className="header-right">
            {isLoggedIn ? (
              <button onClick={handleLogout} className="auth-btn">
                <LogOut size={16} />
                Sign Out
              </button>
            ) : (
              <button onClick={handleLogin} className="auth-btn">
                <LogIn size={16} />
                Sign In
              </button>
            )}
          </div>
      </header>

        {/* Side Navigation */}
        <nav className={`side-nav ${sideNavOpen ? 'open' : ''}`}>
          <div className="nav-header">
            <button onClick={handleNewChat} className="new-chat-btn">
              <Plus size={16} />
              New Chat
            </button>
            <button className="close-nav" onClick={() => setSideNavOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="nav-content">
            <div className="recent-chats">
              <h3>Recent Chats</h3>
              <div className="chat-list">
                {recentChats.map(chat => (
                  <div 
                    key={chat.id} 
                    className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                    onClick={() => handleChatClick(chat.id)}
                  >
                    <MessageSquare size={16} />
                    <div className="chat-info">
                      <span className="chat-title">{chat.title}</span>
                      <span className="chat-time">{formatDate(chat.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="nav-footer">
            <div className="user-info">
              <div className="user-avatar">
                <User size={20} />
              </div>
              <div className="user-details">
                <span className="username">User</span>
                <span className="tokens">{tokens} tokens</span>
              </div>
            </div>
            <button onClick={() => setFaqOpen(true)} className="faq-btn">
              <Settings size={16} />
              FAQ
            </button>
            <p className="copyright">© 2025 MedWira AI. AI powered medicine database</p>
          </div>
        </nav>

        {/* Chat Container */}
        <div className={`chat-container ${showInstallPrompt ? 'with-banner' : ''}`}>
          
          <div className="chat-window" ref={chatWindowRef}>
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <div className="message-footer">
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                    {message.type === 'ai' && (message.content.includes('**Medicine Name:**') || message.content.includes('Medicine Name:') || message.content.includes('**Packaging Detected:**') || message.content.includes('Packaging Detected:')) && (
                      <button 
                        className="message-share-btn" 
                        onClick={() => handleShareMessage(message.content)}
                        title="Share this response"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          <polyline points="16,6 12,2 8,6"/>
                          <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                        Share
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message ai">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
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
                placeholder={allergyPlaceholders[language] || allergyPlaceholders['English']}
                value={allergy}
                onChange={(e) => setAllergy(e.target.value)}
                className="allergy-input"
              />
            </div>
            
            <div className="input-wrapper">
              <input
                type="file"
                accept="image/*"
                id="upload"
                onChange={handleImageUpload}
                className="file-input"
              />
              <label htmlFor="upload" className="upload-btn">
                <Upload size={18} />
            </label>
              
              <button 
                className={`camera-btn ${!cameraAvailable ? 'camera-unavailable' : ''}`}
                onClick={handleCameraCapture}
                disabled={cameraLoading}
                title={!cameraAvailable ? 'Camera is available on mobile/tablet. Please use your phone.' : 'Take photo with camera'}
              >
                {cameraLoading ? (
                  <div className="camera-loading">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                <Camera size={18} />
                )}
              </button>
              
              <div className="text-input-wrapper">
                <input
                  type="text"
                  placeholder={languagePlaceholders[language] || languagePlaceholders['English']}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="text-input"
                />
                <button 
                  className="send-btn" 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* FAQ Modal */}
        {faqOpen && (
          <div className="modal-overlay" onClick={() => setFaqOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>FAQ</h2>
              <ul>
                <li>What is MedWira AI? A clean AI chat platform with SEA language support.</li>
                <li>How do I start a chat? Sign in, select language, type your query.</li>
                <li>Why sign in? For personalized features and token tracking.</li>
                <li>What are tokens? Virtual credits (mocked at 100 initial).</li>
                <li>How to share? Click share for WhatsApp in your language.</li>
                <li>Supported languages? English, Chinese, Malay, Indonesian, Thai, Vietnamese, Tagalog, Burmese, Khmer, Lao (auto-detected).</li>
                <li>Is it mobile-friendly? Yes—add to home screen on phones.</li>
                <li>Privacy: Data stored locally; not medical advice—consult pros.</li>
              </ul>
              <button onClick={() => setFaqOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {/* Sign In Modal */}
        {!isLoggedIn && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Sign In Required</h2>
              <button onClick={handleLogin}>Login with Email (Mock)</button>
              <button onClick={handleLogin}>Login with Google (Mock)</button>
            </div>
            </div>
          )}

        {/* Camera Modal */}
        {showCamera && (
          <div className="camera-modal-overlay">
            <div className="camera-modal-content">
              <div className="camera-header">
                <h3>Take Photo</h3>
                <button onClick={closeCamera} className="camera-close-btn">
                  <X size={24} />
                </button>
              </div>
              <div className="camera-preview">
                <video
                  ref={(el) => {
                    setVideoRef(el);
                    if (el && cameraStream) {
                      el.srcObject = cameraStream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />
              </div>
              <div className="camera-controls">
                <button onClick={capturePhoto} className="capture-btn">
                  <Camera size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && capturedImage && (
          <div className="camera-modal-overlay">
            <div className="camera-modal-content">
              <div className="camera-header">
                <h3>Preview Photo</h3>
                <button onClick={() => setShowPreview(false)} className="camera-close-btn">
                  <X size={24} />
                </button>
              </div>
              <div className="camera-preview">
                <img 
                  src={capturedImage} 
                  alt="Captured photo" 
                  className="captured-image"
                />
              </div>
              <div className="camera-controls">
                <button onClick={retakePhoto} className="retake-btn">
                  <Camera size={20} />
                  Retake
                </button>
                <button onClick={sendCapturedImage} className="send-btn">
                  <Send size={20} />
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </LanguageContext.Provider>
  );
}