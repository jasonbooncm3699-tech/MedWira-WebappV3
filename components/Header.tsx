"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Star } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  darkMode: boolean;
}

export default function Header({ onToggleSidebar, darkMode }: HeaderProps) {
  return (
    <header className={`p-4 border-b ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-white/50'} backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden hover:bg-opacity-20"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-blue-400 to-purple-500'
            }`}>
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                AI Medicine Assistant
              </h1>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Advanced Medicine Identification
              </p>
            </div>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            darkMode ? 'bg-green-400' : 'bg-green-500'
          }`}></div>
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Online
          </span>
        </div>
      </div>
    </header>
  );
}
