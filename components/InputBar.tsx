"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Upload, Camera, Send, Mic, MicOff } from 'lucide-react';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  onImageUpload: (file: File) => void;
  onStartCamera: () => void;
  isLoading: boolean;
  darkMode: boolean;
  tokens: number;
}

export default function InputBar({
  onSendMessage,
  onImageUpload,
  onStartCamera,
  isLoading,
  darkMode,
  tokens
}: InputBarProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('InputBar rendered:', { isLoading, darkMode, tokens, inputMessage }); // Debug log

  // Client-side hydration check
  useEffect(() => {
    console.log('InputBar mounted on client side');
    
    // Test if buttons are clickable
    const uploadBtn = document.querySelector('button[type="button"]');
    const cameraBtn = document.querySelectorAll('button[type="button"]')[1];
    
    console.log('Upload button element:', uploadBtn);
    console.log('Camera button element:', cameraBtn);
    
    if (uploadBtn) {
      console.log('Upload button has onclick:', !!(uploadBtn as HTMLButtonElement).onclick);
    }
  }, []);

  const handleSendMessage = () => {
    console.log('Send button clicked!', { message: inputMessage.trim(), isLoading }); // Debug log
    if (!inputMessage.trim() || isLoading) {
      console.log('Cannot send - empty message or loading');
      return;
    }
    
    console.log('Sending message:', inputMessage.trim());
    onSendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    console.log('Key pressed:', e.key); // Debug log
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('Enter key pressed, sending message'); // Debug log
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('Textarea changed:', e.target.value); // Debug log
    setInputMessage(e.target.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed!'); // Debug log
    const file = e.target.files?.[0];
    console.log('Selected file:', file); // Debug log
    if (file) {
      console.log('File details:', { name: file.name, type: file.type, size: file.size }); // Debug log
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size too large. Please select an image smaller than 10MB.');
        return;
      }
      
      console.log('Calling onImageUpload with file:', file.name); // Debug log
      onImageUpload(file);
    } else {
      console.log('No file selected'); // Debug log
    }
    
    // Reset input value
    e.target.value = '';
  };

  const handleUploadClick = () => {
    console.log('Upload button clicked!'); // Debug log
    if (tokens <= 0) {
      alert('No tokens left! Please subscribe for more scans.');
      return;
    }
    if (isLoading) {
      console.log('Currently loading, ignoring click');
      return;
    }
    console.log('Triggering file input click');
    if (fileInputRef.current) {
      console.log('File input ref found, clicking...');
      fileInputRef.current.click();
    } else {
      console.error('File input ref is null!');
    }
  };

  const handleCameraClick = () => {
    console.log('Camera button clicked!'); // Debug log
    if (tokens <= 0) {
      alert('No tokens left! Please subscribe for more scans.');
      return;
    }
    if (isLoading) {
      console.log('Currently loading, ignoring click');
      return;
    }
    console.log('Starting camera...');
    onStartCamera();
  };

  const toggleRecording = () => {
    console.log('Voice button clicked!'); // Debug log
    setIsRecording(!isRecording);
  };

  return (
    <div className={`border-t p-4 ${
      darkMode 
        ? 'border-gray-600 bg-gray-900' 
        : 'border-gray-200 bg-white'
    }`}>
      {/* Simple Working Test */}
      <div className="mb-2">
        <button 
          onClick={() => alert('Button works!')}
          className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer"
        >
          WORKING TEST BUTTON
        </button>
      </div>
      {/* Token Counter */}
      <div className="flex justify-between items-center mb-3 text-sm">
        <span className={`${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Tokens: {tokens}
        </span>
        <a href="/subscribe" className="text-blue-400 hover:underline">
          Get more tokens
        </a>
      </div>

      {/* Input Area */}
      <div className="flex items-center space-x-3">
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* File Upload Button */}
          <button
            onClick={() => {
              console.log('Upload button clicked!');
              if (tokens <= 0) {
                alert('No tokens left! Please subscribe for more scans.');
                return;
              }
              if (isLoading) {
                console.log('Currently loading, ignoring click');
                return;
              }
              console.log('Triggering file input click');
              if (fileInputRef.current) {
                console.log('File input ref found, clicking...');
                fileInputRef.current.click();
              } else {
                console.error('File input ref is null!');
              }
            }}
            className={`h-[48px] w-12 rounded-xl flex items-center justify-center p-0 hover:bg-opacity-20 transition-all duration-200 ${
              darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100 text-gray-700'
            } ${isLoading || tokens <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={isLoading || tokens <= 0}
            type="button"
          >
            <Upload className="h-6 w-6" />
          </button>
          
          {/* Camera Button */}
          <button
            onClick={() => {
              console.log('Camera button clicked!');
              if (tokens <= 0) {
                alert('No tokens left! Please subscribe for more scans.');
                return;
              }
              if (isLoading) {
                console.log('Currently loading, ignoring click');
                return;
              }
              console.log('Starting camera...');
              onStartCamera();
            }}
            className={`h-[48px] w-12 rounded-xl flex items-center justify-center p-0 hover:bg-opacity-20 transition-all duration-200 ${
              darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100 text-gray-700'
            } ${isLoading || tokens <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={isLoading || tokens <= 0}
            type="button"
          >
            <Camera className="h-6 w-6" />
          </button>
          
          {/* Voice Input Button */}
          <button
            onClick={() => {
              console.log('Voice button clicked!');
              setIsRecording(!isRecording);
            }}
            className={`h-[48px] w-12 rounded-xl flex items-center justify-center p-0 hover:bg-opacity-20 transition-all duration-200 ${
              darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100 text-gray-700'
            } ${isRecording ? 'bg-red-500 text-white' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={isLoading}
            type="button"
          >
            {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={inputMessage}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            onFocus={() => console.log('Textarea focused')} // Debug log
            onBlur={() => console.log('Textarea blurred')} // Debug log
            placeholder="Ask about medicines or upload an image..."
            className={`w-full resize-none rounded-xl px-4 py-3 border transition-all duration-200 text-base ${
              darkMode 
                ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400 focus:border-gray-400' 
                : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={isLoading}
          />
          
          {/* Character count */}
          {inputMessage.length > 0 && (
            <div className={`absolute bottom-2 right-3 text-xs ${
              darkMode ? 'text-slate-400' : 'text-gray-400'
            }`}>
              {inputMessage.length}
            </div>
          )}
        </div>
        
        {/* Send Button */}
        <button
          onClick={() => {
            console.log('Send button clicked!', { message: inputMessage.trim(), isLoading });
            if (!inputMessage.trim() || isLoading) {
              console.log('Cannot send - empty message or loading');
              return;
            }
            
            console.log('Sending message:', inputMessage.trim());
            onSendMessage(inputMessage.trim());
            setInputMessage('');
          }}
          disabled={!inputMessage.trim() || isLoading}
          className={`h-[48px] w-12 flex-shrink-0 rounded-xl flex items-center justify-center p-0 transition-all duration-200 ${
            inputMessage.trim() && !isLoading
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : darkMode 
                ? 'bg-slate-700 text-slate-400' 
                : 'bg-gray-200 text-gray-400'
          } ${!inputMessage.trim() || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          type="button"
        >
          <Send className="h-6 w-6" />
        </button>
      </div>
      
      {/* File Input - Multiple approaches for reliability */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        id="file-upload-input"
      />
      
      {/* Alternative file input overlay */}
      <input
        type="file"
        accept="image/*"
        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileUpload}
        style={{ pointerEvents: 'auto' }}
      />
      
      {/* Recording Indicator */}
      {isRecording && (
        <div className={`mt-2 p-2 rounded-lg text-center ${
          darkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Recording...</span>
          </div>
        </div>
      )}
    </div>
  );
}