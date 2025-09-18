"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'medicine_result';
  imageUrl?: string;
  results?: {
    pillInfo: string;
    details: string;
    allergyWarning: string;
    packaging: boolean;
    warning?: string;
  };
}

interface MessageBubbleProps {
  message: Message;
  darkMode: boolean;
}

export default function MessageBubble({ message, darkMode }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    // Use consistent 24-hour format to avoid hydration issues
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            message.role === 'user' 
              ? darkMode 
                ? 'bg-gray-600 text-white'
                : 'bg-blue-500 text-white'
              : darkMode 
                ? 'bg-gray-700 text-white'
                : 'bg-purple-500 text-white'
          }`}>
            {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>
        </div>
        
        {/* Message Bubble */}
        <div className={`rounded-2xl px-4 py-3 shadow-lg ${
          message.role === 'user'
            ? darkMode
              ? 'bg-gray-700 text-white border border-gray-600'
              : 'bg-blue-500 text-white'
            : darkMode 
              ? 'bg-gray-800 text-white border border-gray-600' 
              : 'bg-white text-gray-900 border border-gray-200 shadow-md'
        }`}>
          {/* Image Display */}
          {message.type === 'image' && message.imageUrl && (
            <div className="mb-3">
              <img 
                src={message.imageUrl} 
                alt="Uploaded medicine" 
                className="max-w-full h-auto rounded-lg max-h-48 object-contain"
              />
            </div>
          )}
          
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            {message.type === 'medicine_result' && message.results ? (
              <div>
                <div className={`font-semibold mb-2 text-lg ${
                  message.role === 'user' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {message.results.pillInfo}
                </div>
                <div className={`text-sm space-y-2 ${
                  message.role === 'user' ? 'text-blue-100' : darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  <div className={`prose prose-sm max-w-none ${
                    darkMode ? 'prose-invert' : 'prose-gray'
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                      }}
                    >
                      {message.results.details}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  darkMode 
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' 
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  ⚠️ {message.results.allergyWarning}
                </div>
              </div>
            ) : (
              <div className={`${
                message.role === 'user' ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {message.role === 'ai' ? (
                  <div className={`prose prose-sm max-w-none ${
                    darkMode ? 'prose-invert' : 'prose-gray'
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => (
                          <code className={`px-1 py-0.5 rounded text-xs ${
                            darkMode ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className={`p-3 rounded-lg overflow-x-auto ${
                            darkMode ? 'bg-slate-800 text-slate-200' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs mt-2 ${
            message.role === 'user' ? 'text-blue-100' : darkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading indicator component
export function LoadingIndicator({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex mr-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          darkMode 
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
            : 'bg-gradient-to-r from-purple-400 to-purple-500 text-white'
        }`}>
          <Bot className="h-4 w-4" />
        </div>
      </div>
      <div className={`rounded-2xl px-4 py-3 shadow-lg ${
        darkMode 
          ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-slate-600' 
          : 'bg-white text-gray-900 border border-gray-200 shadow-md'
      }`}>
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing...</span>
        </div>
      </div>
    </div>
  );
}
