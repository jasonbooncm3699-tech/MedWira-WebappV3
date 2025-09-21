'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { Bot, User, Send, Upload, Camera, Menu, X, Plus, MessageSquare, Settings, LogOut, LogIn } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './globals.css';

const LanguageContext = createContext({ language: 'English', setLanguage: (lang: string) => {} });

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [allergy, setAllergy] = useState('');

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

  const welcomeMessages: { [key: string]: string } = {
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
  };

  useEffect(() => {
    // Check for saved language preference first
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    } else {
      // Auto-detect browser language if no preference saved
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      const langMap: { [key: string]: string } = { 
        en: 'English', zh: 'Chinese', ms: 'Malay', id: 'Indonesian', th: 'Thai', 
        vi: 'Vietnamese', tl: 'Tagalog', my: 'Burmese', km: 'Khmer', lo: 'Lao' 
      };
      setLanguage(langMap[browserLang] || 'English');
    }

    const mobileCheck = /Android|iPhone|iPad/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;
    setIsMobile(mobileCheck);
    if (mobileCheck) setShowInstallPrompt(true);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
    // Use dummy chats if no stored chats exist
    setRecentChats(storedChats.length > 0 ? storedChats : dummyChats);
    const storedTokens = parseInt(localStorage.getItem('tokens') || '100');
    setTokens(storedTokens);
    if (localStorage.getItem('loggedIn') === 'true') setIsLoggedIn(true);

    // Initialize welcome message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'ai',
        content: welcomeMessages[language] || welcomeMessages['English'],
        timestamp: new Date()
      }]);
    }
  }, [language]);

  // Check camera availability on mount
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
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
    
    // OpenAI API call
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
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: 'Sorry, I encountered an error while analyzing the image. Please try again or contact support.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const generateMedicineAnalysis = (lang: string, isMedicineImage: boolean = true) => {
    if (!isMedicineImage) {
      const errorResponses: { [key: string]: string } = {
        'English': `**Error: Non-Medicine Image Detected**

The uploaded image does not appear to contain medicine-related content. For accurate medicine identification, please upload a photo that shows:

• Medicine packaging (box, bottle, or blister strip)
• Medicine tablets/pills with clear markings
• Prescription labels
• Medicine bottles with labels

**Safety Note:** We cannot identify non-medicine items or provide medical information for unrelated images.

Please upload a clear photo of your medicine for proper identification and safety information.`,

        'Malay': `**Ralat: Imej Bukan Ubat Dikesan**

Imej yang dimuat naik tidak kelihatan mengandungi kandungan berkaitan ubat. Untuk pengenalan ubat yang tepat, sila muat naik foto yang menunjukkan:

• Pembungkusan ubat (kotak, botol, atau jalur lepuh)
• Tablet/pil ubat dengan tanda yang jelas
• Label preskripsi
• Botol ubat dengan label

**Nota Keselamatan:** Kami tidak dapat mengenal pasti item bukan ubat atau memberikan maklumat perubatan untuk imej yang tidak berkaitan.

Sila muat naik foto yang jelas tentang ubat anda untuk pengenalan dan maklumat keselamatan yang betul.`,

        'Chinese': `**错误：检测到非药品图片**

上传的图片似乎不包含药品相关内容。为了准确识别药品，请上传显示以下内容的照片：

• 药品包装（盒子、瓶子或泡罩条）
• 带有清晰标记的药片/药丸
• 处方标签
• 带标签的药瓶

**安全提示：** 我们无法识别非药品物品或为无关图片提供医疗信息。

请上传清晰的药品照片以获得正确的识别和安全信息。`,

        'Indonesian': `**Error: Gambar Non-Obat Terdeteksi**

Gambar yang diunggah tidak tampak mengandung konten terkait obat. Untuk identifikasi obat yang akurat, silakan unggah foto yang menunjukkan:

• Kemasan obat (kotak, botol, atau strip blister)
• Tablet/pil obat dengan tanda yang jelas
• Label resep
• Botol obat dengan label

**Catatan Keamanan:** Kami tidak dapat mengidentifikasi item non-obat atau memberikan informasi medis untuk gambar yang tidak terkait.

Silakan unggah foto yang jelas tentang obat Anda untuk identifikasi dan informasi keamanan yang tepat.`
      };
      return errorResponses[lang] || errorResponses['English'];
    }

    const responses: { [key: string]: string } = {
      'English': `**Packaging Detected:** Yes—blister strip/box with "Panadol" label visible. Proceed with identification.

**Medicine Name:** Panadol (Paracetamol/Acetaminophen 500mg)

**Purpose:** Relieves mild to moderate pain (e.g., headache, toothache, backache) and reduces fever (e.g., for flu or colds). Based on packaging: For adults and children over 12.

**Dosage (from packaging and web info):**
• Adults/Children over 12: 1-2 tablets every 4-6 hours, max 8 tablets per day.
• Children 7-12 years: 1 tablet every 4-6 hours, max 4 tablets per day.
• Do not exceed recommended dose; follow packaging instructions.

**Side Effects:** Common: None frequent. Rare: Skin rash, allergic reactions, or stomach upset. Overdose risk: Liver damage—seek immediate help if exceeded.

**Allergy Warning:** Contains paracetamol and excipients (e.g., starch, magnesium stearate). May cause reactions if allergic. If you entered allergies (e.g., paracetamol), warning: Potential trigger—consult a doctor.

**Drug Interactions:**
• With other drugs: Do not combine with other paracetamol products (e.g., cold meds) to avoid overdose. May enhance effects of blood thinners (e.g., warfarin) or interact with seizure meds (e.g., phenytoin).
• With food: Can be taken with or without food; no major interactions.
• With alcohol: Avoid—alcohol increases liver toxicity risk when taken with paracetamol.

**Safety Notes:**
• For kids: Suitable for children over 7 per packaging, but consult pediatrician for younger ages or if under 12.
• For pregnant women: Category B—generally safe in low doses, but consult doctor (especially if breastfeeding or third trimester).
• Other: Not for those with liver/kidney issues. Check packaging expiry date.

**Cross-Border Info:** Equivalent to "Panadol" in Malaysia/Singapore/Thailand; "Hapacol" or "Efferalgan" in Vietnam; "Biogesic" in Philippines. Widely available in SEA pharmacies.

**Storage:** Keep in original packaging below 30°C, dry place. Do not use if damaged.

**Disclaimer:** This information is sourced from public websites and packaging details. For informational purposes only. Not medical advice. Consult a doctor or pharmacist before use.`,

      'Chinese': `**检测到包装：** 是的—可见带有"Panadol"标签的泡罩条/盒子。继续进行识别。

**药品名称：** 必理痛 (扑热息痛/对乙酰氨基酚 500mg)

**用途：** 缓解轻度至中度疼痛（如头痛、牙痛、背痛）并退烧（如流感或感冒）。根据包装：适用于成人和12岁以上儿童。

**剂量（来自包装和网络信息）：**
• 成人/12岁以上儿童：每4-6小时1-2片，每日最多8片。
• 7-12岁儿童：每4-6小时1片，每日最多4片。
• 不要超过推荐剂量；遵循包装说明。

**副作用：** 常见：无明显副作用。罕见：皮疹、过敏反应或胃部不适。过量风险：肝损伤—如超量请立即就医。

**过敏警告：** 含有扑热息痛和辅料（如淀粉、硬脂酸镁）。如对扑热息痛过敏可能引起反应。如果您输入了过敏信息（如扑热息痛），警告：潜在触发因素—请咨询医生。

**药物相互作用：**
• 与其他药物：不要与其他扑热息痛产品（如感冒药）同时服用以避免过量。可能增强血液稀释剂（如华法林）的效果或与抗癫痫药物（如苯妥英）相互作用。
• 与食物：可与食物一起服用或空腹服用；无主要相互作用。
• 与酒精：避免—酒精与扑热息痛同服会增加肝毒性风险。

**安全注意事项：**
• 对于儿童：根据包装适用于7岁以上儿童，但12岁以下或更小年龄请咨询儿科医生。
• 对于孕妇：B类—低剂量通常安全，但请咨询医生（特别是哺乳期或妊娠晚期）。
• 其他：不适合有肝/肾问题的人。检查包装有效期。

**跨境信息：** 在马来西亚/新加坡/泰国相当于"Panadol"；在越南为"Hapacol"或"Efferalgan"；在菲律宾为"Biogesic"。在东南亚药店广泛销售。

**储存：** 在原始包装中保存，温度低于30°C，干燥处。如损坏请勿使用。

**免责声明：** 此信息来源于公共网站和包装详情。仅供参考。非医疗建议。使用前请咨询医生或药剂师。`,

      'Malay': `**Pembungkusan Dikesan:** Ya—jalur lepuh/kotak dengan label "Panadol" kelihatan. Teruskan dengan pengenalan.

**Nama Ubat:** Panadol (Paracetamol/Acetaminophen 500mg)

**Tujuan:** Melegakan kesakitan ringan hingga sederhana (cth, sakit kepala, sakit gigi, sakit belakang) dan mengurangkan demam (cth, untuk selesema). Berdasarkan pembungkusan: Untuk dewasa dan kanak-kanak berumur 12 tahun ke atas.

**Dos (dari pembungkusan dan maklumat web):**
• Dewasa/Kanak-kanak 12+: 1-2 tablet setiap 4-6 jam, maksimum 8 tablet sehari.
• Kanak-kanak 7-12 tahun: 1 tablet setiap 4-6 jam, maksimum 4 tablet sehari.
• Jangan melebihi dos yang disyorkan; ikut arahan pembungkusan.

**Kesan Sampingan:** Biasa: Tiada yang kerap. Jarang: Ruam kulit, reaksi alahan, atau sakit perut. Risiko overdos: Kerosakan hati—dapatkan bantuan segera jika melebihi.

**Amaran Alahan:** Mengandungi paracetamol dan eksipien (cth, kanji, magnesium stearate). Boleh menyebabkan reaksi jika alah. Jika anda memasukkan alahan (cth, paracetamol), amaran: Pencetus berpotensi—berunding dengan doktor.

**Interaksi Ubat:**
• Dengan ubat lain: Jangan gabungkan dengan produk paracetamol lain (cth, ubat selesema) untuk mengelakkan overdos. Boleh meningkatkan kesan pengencer darah (cth, warfarin) atau berinteraksi dengan ubat sawan (cth, phenytoin).
• Dengan makanan: Boleh diambil dengan atau tanpa makanan; tiada interaksi utama.
• Dengan alkohol: Elakkan—alkohol meningkatkan risiko ketoksikan hati apabila diambil dengan paracetamol.

**Nota Keselamatan:**
• Untuk kanak-kanak: Sesuai untuk kanak-kanak berumur 7+ mengikut pembungkusan, tetapi berunding dengan pakar pediatrik untuk usia yang lebih muda atau jika di bawah 12.
• Untuk wanita hamil: Kategori B—biasanya selamat dalam dos rendah, tetapi berunding dengan doktor (terutama jika menyusu atau trimester ketiga).
• Lain-lain: Tidak untuk mereka yang mempunyai masalah hati/ginjal. Semak tarikh luput pembungkusan.

**Maklumat Lintas Sempadan:** Setara dengan "Panadol" di Malaysia/Singapore/Thailand; "Hapacol" atau "Efferalgan" di Vietnam; "Biogesic" di Filipina. Mudah didapati di farmasi SEA.

**Penyimpanan:** Simpan dalam pembungkusan asal di bawah 30°C, tempat kering. Jangan gunakan jika rosak.

**Penafian:** Maklumat ini diperoleh dari laman web awam dan butiran pembungkusan. Untuk tujuan maklumat sahaja. Bukan nasihat perubatan. Berunding dengan doktor atau ahli farmasi sebelum digunakan.`,

      'Indonesian': `**Kemasan Terdeteksi:** Ya—strip blister/kotak dengan label "Panadol" terlihat. Lanjutkan dengan identifikasi.

**Nama Obat:** Panadol (Paracetamol/Acetaminophen 500mg)

**Tujuan:** Meredakan nyeri ringan hingga sedang (misalnya, sakit kepala, sakit gigi, sakit punggung) dan menurunkan demam (misalnya, untuk flu atau pilek). Berdasarkan kemasan: Untuk dewasa dan anak-anak di atas 12 tahun.

**Dosis (dari kemasan dan info web):**
• Dewasa/Anak-anak 12+: 1-2 tablet setiap 4-6 jam, maksimal 8 tablet per hari.
• Anak-anak 7-12 tahun: 1 tablet setiap 4-6 jam, maksimal 4 tablet per hari.
• Jangan melebihi dosis yang direkomendasikan; ikuti instruksi kemasan.

**Efek Samping:** Umum: Tidak ada yang sering. Jarang: Ruam kulit, reaksi alergi, atau sakit perut. Risiko overdosis: Kerusakan hati—cari bantuan segera jika melebihi.

**Peringatan Alergi:** Mengandung paracetamol dan eksipien (misalnya, pati, magnesium stearate). Dapat menyebabkan reaksi jika alergi. Jika Anda memasukkan alergi (misalnya, paracetamol), peringatan: Pemicu potensial—konsultasikan dokter.

**Interaksi Obat:**
• Dengan obat lain: Jangan gabungkan dengan produk paracetamol lain (misalnya, obat flu) untuk menghindari overdosis. Dapat meningkatkan efek pengencer darah (misalnya, warfarin) atau berinteraksi dengan obat kejang (misalnya, phenytoin).
• Dengan makanan: Dapat dikonsumsi dengan atau tanpa makanan; tidak ada interaksi utama.
• Dengan alkohol: Hindari—alkohol meningkatkan risiko toksisitas hati ketika dikonsumsi dengan paracetamol.

**Catatan Keamanan:**
• Untuk anak-anak: Cocok untuk anak-anak di atas 7 tahun sesuai kemasan, tetapi konsultasikan dokter anak untuk usia yang lebih muda atau jika di bawah 12.
• Untuk wanita hamil: Kategori B—umumnya aman dalam dosis rendah, tetapi konsultasikan dokter (terutama jika menyusui atau trimester ketiga).
• Lainnya: Tidak untuk mereka yang memiliki masalah hati/ginjal. Periksa tanggal kedaluwarsa kemasan.

**Info Lintas Batas:** Setara dengan "Panadol" di Malaysia/Singapore/Thailand; "Hapacol" atau "Efferalgan" di Vietnam; "Biogesic" di Filipina. Tersedia luas di apotek SEA.

**Penyimpanan:** Simpan dalam kemasan asli di bawah 30°C, tempat kering. Jangan gunakan jika rusak.

**Disclaimer:** Informasi ini bersumber dari situs web publik dan detail kemasan. Hanya untuk tujuan informasi. Bukan saran medis. Konsultasikan dokter atau apoteker sebelum digunakan.`
    };

    return responses[lang] || responses['English'];
  };

  const handleCameraCapture = async () => {
    console.log('Camera button clicked');
    setCameraLoading(true);
    
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      // Check if we're on HTTPS or localhost
      const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if (!isSecureContext) {
        throw new Error('HTTPS_REQUIRED');
      }

      // Check if we're on mobile
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: isMobileDevice ? 1920 : 1280 },
          height: { ideal: isMobileDevice ? 1080 : 720 }
        } 
      });
      console.log('Camera access granted');
      setCameraStream(stream);
      setShowCamera(true);
      setCameraLoading(false);
      
      // Set video source once video element is ready
      if (videoRef) {
        videoRef.srcObject = stream;
      }
    } catch (error: any) {
      console.log('Camera access error:', error);
      setCameraLoading(false);
      
      let errorMessage = '';
      let showFileUpload = false;
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permission in your browser settings, or use the upload button to select a photo from your device.';
        showFileUpload = true;
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device. Please use the upload button to select a photo from your device.';
        showFileUpload = true;
      } else if (error.message === 'HTTPS_REQUIRED') {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          errorMessage = 'Mobile camera requires HTTPS or network access. Try accessing via your computer\'s IP address (e.g., http://192.168.1.100:3000) or use the upload button.';
        } else {
          errorMessage = 'Camera access requires HTTPS. For development, please use https://localhost:3000 or upload a photo using the upload button.';
        }
        showFileUpload = true;
      } else if (error.message === 'Camera not supported') {
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
    if (!videoRef || !cameraStream) return;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = videoRef.videoWidth;
    canvas.height = videoRef.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(videoRef, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        
        // Process the captured image through the new AI analysis
        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageBase64 = event.target?.result as string;
          
          const imageMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: cameraCaptureMessages[language] || cameraCaptureMessages['English'],
            timestamp: new Date(),
            image: imageBase64
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
                imageBase64,
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
            console.error('Camera image analysis error:', error);
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              content: 'Sorry, I encountered an error while analyzing the captured image. Please try again.',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(file);
      }
    }, 'image/jpeg', 0.8);
    
    // Close camera
    closeCamera();
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleShare = () => {
    console.log('Share button clicked');
    const shareText = `Check out Seamed AI - AI Medicine Assistant!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareMessage = (messageContent: string) => {
    console.log('Share message button clicked');
    const shareText = `Seamed AI Analysis:\n\n${messageContent}\n\nPowered by Seamed AI`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleInstall = () => {
    console.log('Install button clicked');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      });
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Language changed to:', e.target.value);
    setLanguage(e.target.value);
    
    // Save language preference to localStorage
    localStorage.setItem('selectedLanguage', e.target.value);
    
    // Update welcome message in current chat
    if (messages.length > 0 && messages[0].type === 'ai') {
      setMessages(prev => prev.map((msg, index) => 
        index === 0 ? { ...msg, content: welcomeMessages[e.target.value] || welcomeMessages['English'] } : msg
      ));
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div className="app">
        {/* Install Banner */}
        {showInstallPrompt && (
          <div className="install-banner-top">
            <div className="install-content">
              <span>Add Seamed AI to your home screen!</span>
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
            <p className="copyright">© 2025 Seamed AI. Not medical advice.</p>
          </div>
        </nav>

        {/* Chat Container */}
        <div className={`chat-container ${showInstallPrompt ? 'with-banner' : ''}`}>
          
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <div className="message-footer">
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                    {message.type === 'ai' && (message.content.includes('**Medicine Name:**') || message.content.includes('Medicine Name:')) && (
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
                disabled={cameraLoading || !cameraAvailable}
                title={!cameraAvailable ? 'Camera not available. Use upload button instead.' : 'Take photo with camera'}
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
                <li>What is Seamed AI? A clean AI chat platform with SEA language support.</li>
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
        </div>
    </LanguageContext.Provider>
  );
}