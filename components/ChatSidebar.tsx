"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu, X, User, MessageSquare, Settings, Star } from 'lucide-react';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
  tokens: number;
}

export default function ChatSidebar({
  isOpen,
  onToggle,
  darkMode,
  onToggleTheme,
  language,
  onLanguageChange,
  tokens
}: ChatSidebarProps) {
  const chatHistory = [
    { id: '1', title: 'Medicine Identification', timestamp: '2 min ago' },
    { id: '2', title: 'Allergy Check', timestamp: '1 hour ago' },
    { id: '3', title: 'Dosage Question', timestamp: '3 hours ago' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${darkMode 
          ? 'bg-gray-900 border-r border-gray-600' 
          : 'bg-white border-r border-gray-200'
        }
      `}>
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-blue-400 to-purple-500'
              }`}>
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  AI Assistant
                </h2>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Medicine Expert
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* User Profile */}
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-slate-700' : 'bg-gray-200'
            }`}>
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                User
              </h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {tokens} tokens remaining
              </p>
            </div>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Recent Chats
          </h4>
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  darkMode 
                    ? 'hover:bg-slate-700 border border-slate-600' 
                    : 'hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {chat.title}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {chat.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Settings
          </h4>
          
          {/* Language Selector */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Language
            </label>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-slate-800 text-white border-slate-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            >
              <option value="English">English</option>
              <option value="Malay">Malay</option>
              <option value="Chinese">Chinese</option>
              <option value="Vietnamese">Vietnamese</option>
              <option value="Thai">Thai</option>
              <option value="Tagalog">Tagalog</option>
              <option value="Khmer">Khmer</option>
              <option value="Lao">Lao</option>
              <option value="Burmese">Burmese</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Dark Mode
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="hover:bg-opacity-20"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
