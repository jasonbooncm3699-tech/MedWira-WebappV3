"use client";

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;
    
    onSendMessage(inputMessage.trim());
    setInputMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording functionality
  };

  return (
    <div className={`border-t p-4 ${
      darkMode 
        ? 'border-gray-600 bg-gray-900' 
        : 'border-gray-200 bg-white'
    }`}>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className={`h-[48px] w-12 rounded-xl flex items-center justify-center p-0 hover:bg-opacity-20 ${
                darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              }`}
              disabled={isLoading}
            >
              <Upload className="h-6 w-6" />
            </Button>
            
            {/* Camera Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onStartCamera}
              className={`h-[48px] w-12 rounded-xl flex items-center justify-center p-0 hover:bg-opacity-20 ${
                darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              }`}
              disabled={isLoading}
            >
              <Camera className="h-6 w-6" />
            </Button>
            
            {/* Voice Input Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              className={`h-[48px] w-12 rounded-xl flex items-center justify-center p-0 hover:bg-opacity-20 ${
                darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              } ${isRecording ? 'bg-red-500 text-white' : ''}`}
              disabled={isLoading}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
          </div>
        
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
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
        <Button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
          className={`h-[48px] w-12 flex-shrink-0 rounded-xl flex items-center justify-center p-0 ${
            inputMessage.trim() && !isLoading
              ? 'bg-blue-500 hover:bg-blue-600'
              : darkMode 
                ? 'bg-slate-700 text-slate-400' 
                : 'bg-gray-200 text-gray-400'
          }`}
        >
          <Send className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
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
