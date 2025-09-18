"use client";

import React from 'react';

interface FuturisticLoadingProps {
  darkMode: boolean;
  message?: string;
}

export default function FuturisticLoading({ darkMode, message = "Analyzing..." }: FuturisticLoadingProps) {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex mr-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          darkMode 
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
            : 'bg-gradient-to-r from-purple-400 to-purple-500 text-white'
        }`}>
          <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
        </div>
      </div>
      <div className={`rounded-2xl px-4 py-3 shadow-lg ${
        darkMode 
          ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-slate-600' 
          : 'bg-white text-gray-900 border border-gray-200 shadow-md'
      }`}>
        <div className="flex items-center space-x-2">
          {/* Futuristic pulsing dots animation */}
          <div className="flex space-x-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              darkMode ? 'bg-blue-400' : 'bg-blue-500'
            }`} style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              darkMode ? 'bg-purple-400' : 'bg-purple-500'
            }`} style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              darkMode ? 'bg-cyan-400' : 'bg-cyan-500'
            }`} style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
          </div>
          <span className="text-sm font-medium">{message}</span>
        </div>
        
        {/* Additional futuristic elements */}
        <div className="mt-2 flex items-center space-x-1">
          <div className={`w-1 h-1 rounded-full ${
            darkMode ? 'bg-green-400' : 'bg-green-500'
          } animate-pulse`} style={{ animationDelay: '600ms' }}></div>
          <div className={`w-1 h-1 rounded-full ${
            darkMode ? 'bg-yellow-400' : 'bg-yellow-500'
          } animate-pulse`} style={{ animationDelay: '800ms' }}></div>
          <div className={`w-1 h-1 rounded-full ${
            darkMode ? 'bg-pink-400' : 'bg-pink-500'
          } animate-pulse`} style={{ animationDelay: '1000ms' }}></div>
          <span className={`text-xs ml-2 ${
            darkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            Processing neural patterns...
          </span>
        </div>
      </div>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex mr-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          darkMode 
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
            : 'bg-gradient-to-r from-purple-400 to-purple-500 text-white'
        }`}>
          <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
        </div>
      </div>
      <div className={`rounded-2xl px-4 py-3 shadow-lg ${
        darkMode 
          ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-slate-600' 
          : 'bg-white text-gray-900 border border-gray-200 shadow-md'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="text-sm">AI is typing</span>
          <div className="flex space-x-1">
            <div className={`w-1 h-1 rounded-full ${
              darkMode ? 'bg-blue-400' : 'bg-blue-500'
            } animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`w-1 h-1 rounded-full ${
              darkMode ? 'bg-purple-400' : 'bg-purple-500'
            } animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`w-1 h-1 rounded-full ${
              darkMode ? 'bg-cyan-400' : 'bg-cyan-500'
            } animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
