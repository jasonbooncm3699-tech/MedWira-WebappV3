"use client";

import React, { useState, useRef, useEffect } from 'react';
import ChatSidebar from '@/components/ChatSidebar';
import MessageBubble from '@/components/MessageBubble';
import InputBar from '@/components/InputBar';
import Header from '@/components/Header';
import FuturisticLoading, { TypingIndicator } from '@/components/FuturisticLoading';
import { Camera, X } from 'lucide-react';

interface Results {
  pillInfo: string;
  details: string;
  allergyWarning: string;
  packaging: boolean;
  warning?: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'medicine_result';
  imageUrl?: string;
  results?: Results;
}

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('English');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [tokens, setTokens] = useState(5);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Initialize with welcome message after component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'ai',
        content: 'Hello! I\'m your advanced AI Medicine Assistant. I can help you identify medicines by analyzing photos of pills, tablets, or packaging. You can upload an image, take a photo using your camera, or simply ask me questions about medicines.',
        timestamp: new Date(),
        type: 'text'
      }]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mock results for UI demo (replace with API later)
  const mockResults = {
    pillInfo: 'Tamiflu (Oseltamivir 75mg)',
    details: `- **What It Does**: Fights flu virus, reduces fever, chills, aches, sore throat.\n- **Dosage**: Adults (13+): 1 capsule twice daily, 5 days. Kids (1-12): Ask doctor.\n- **Side Effects**: Nausea, headache. Rare: Rash, confusion—see doctor.\n- **Allergies**: Contains oseltamivir. May cause reactions—check with doctor.\n- **Don't Mix**: Avoid alcohol, some meds (e.g., kidney drugs).\n- **Kids/Pregnant**: Kids 1+ with doctor okay. Pregnant: Ask doctor.\n- **Store**: Cool, dry, in pack. Check expiry.\n- **In SEA**: Tamiflu in Malaysia/Vietnam; generics in Philippines.\n- **Note**: Not medical advice—consult doctor.`,
    allergyWarning: 'No allergy conflicts detected. Consult a doctor.',
    packaging: true,
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track: MediaStreamTrack) => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
            processImage(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const addMessage = (role: 'user' | 'ai', content: string, type: 'text' | 'image' | 'medicine_result' = 'text', imageUrl?: string, results?: Results) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      type,
      imageUrl,
      results
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const processImage = async (file: File) => {
    if (tokens <= 0) {
      addMessage('ai', 'Sorry, you have no tokens left! Please subscribe for more scans.');
      return;
    }
    
    setIsLoading(true);
    const imageUrl = URL.createObjectURL(file);
    
    // Add user message with image
    addMessage('user', 'I uploaded an image for medicine identification', 'image', imageUrl);
    
    // Simulate API call delay
    setTimeout(() => {
      addMessage('ai', `I've identified this medicine: **${mockResults.pillInfo}**\n\n${mockResults.details}\n\n⚠️ **Allergy Warning**: ${mockResults.allergyWarning}`, 'medicine_result', undefined, mockResults);
      setTokens(tokens - 1);
      setIsLoading(false);
    }, 2000);
  };

  const handleImageUpload = (file: File) => {
    processImage(file);
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim() || isLoading) return;
    
    addMessage('user', message);
    
    // Show typing indicator
    setIsTyping(true);
    setIsLoading(true);
    
    // Simulate AI response with better content
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        `I understand you're asking about: **"${message}"**. For medicine identification, please upload an image or take a photo using the camera button below.\n\n**How to get started:**\n1. 📸 Use the camera button to take a photo\n2. 🖼️ Or upload an image from your device\n3. 💊 I'll analyze and provide detailed information\n4. ⚠️ Check for any allergy warnings`,
        `Great question about **"${message}"**! To help you identify medicines accurately, I need to see the actual medication. Here's what you can do:\n\n**Options:**\n- **Camera**: Tap the camera icon for instant photo capture\n- **Upload**: Use the upload button to select an image\n- **Details**: I'll provide comprehensive medicine information\n- **Safety**: Always check allergy warnings before use`,
        `I'd be happy to help with **"${message}"**! For accurate medicine identification, please share an image of the medication.\n\n**What I can analyze:**\n- 💊 Pill identification and dosage information\n- 📋 Active ingredients and side effects\n- ⚠️ Allergy warnings and interactions\n- 🌍 Information in your preferred language\n\nUpload an image to get started!`
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addMessage('ai', randomResponse);
      setIsLoading(false);
    }, 1500 + Math.random() * 1000); // Random delay between 1.5-2.5 seconds
  };

  const handleShare = (results: Results) => {
    if (navigator.share) {
      navigator.share({
        text: `${results.pillInfo}\n${results.details}\n${results.allergyWarning}`,
      });
    }
  };

  return (
    <div className={`min-h-screen flex transition-all duration-500 ${
      darkMode 
        ? 'cosmic-background cosmic-gradient text-white' 
        : 'bg-gray-100 text-gray-900'
    }`}>
      {/* Cosmic Background Effects */}
      {darkMode && (
        <>
          <div className="fixed inset-0 overflow-hidden pointer-events-none cosmic-particles">
            {/* Random blinking stars */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="cosmic-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${2 + Math.random() * 4}s`
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        darkMode={darkMode}
        onToggleTheme={toggleDarkMode}
        language={language}
        onLanguageChange={setLanguage}
        tokens={tokens}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} darkMode={darkMode} />

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto rounded-xl shadow-2xl"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-4 right-4">
                <button
                  onClick={stopCamera}
                  className="bg-black/50 text-white hover:bg-black/70 rounded-full p-2 backdrop-blur-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={capturePhoto}
                  className="bg-white text-black hover:bg-gray-200 rounded-full p-4 shadow-2xl transition-all duration-200 hover:scale-105"
                >
                  <Camera className="h-8 w-8" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <main className={`flex-1 flex flex-col relative ${
          darkMode ? 'backdrop-blur-sm' : ''
        }`}>
          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 ${
            darkMode ? 'relative z-10' : ''
          }`}>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`animate-fade-in ${
                  index === messages.length - 1 ? 'animate-slide-up' : ''
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <MessageBubble message={message} darkMode={darkMode} />
              </div>
            ))}
            
            {/* Loading Indicators */}
            {isTyping && <TypingIndicator darkMode={darkMode} />}
            {isLoading && !isTyping && <FuturisticLoading darkMode={darkMode} message="Processing your request..." />}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <InputBar
            onSendMessage={handleSendMessage}
            onImageUpload={handleImageUpload}
            onStartCamera={startCamera}
            isLoading={isLoading}
            darkMode={darkMode}
            tokens={tokens}
          />
        </main>

        {/* Footer */}
        <footer className={`p-4 text-center text-sm border-t ${
          darkMode ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500'
        }`}>
          Disclaimer: For informational purposes only. Not medical advice. Consult a doctor.
        </footer>
      </div>
    </div>
  );
}