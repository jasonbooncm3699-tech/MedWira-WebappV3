'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ChevronRight, Mail, Facebook, Instagram, Twitter } from 'lucide-react';

interface Section {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: Section[];
  children: React.ReactNode;
  currentPage: 'privacy' | 'terms' | 'terms-of-sale';
}

/**
 * Shared layout component for legal pages
 * Design inspired by Grab, Shopee, and iFlix for SEA market appeal
 * Features: Sticky header, sidebar ToC, responsive mobile menu, dark theme
 */
export default function LegalPageLayout({ 
  title, 
  lastUpdated, 
  sections, 
  children,
  currentPage 
}: LegalPageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A202C] via-[#2D3748] to-[#1A202C] text-[#F7FAFC] font-['Poppins',sans-serif]">
      {/* Sticky Header with Teal Gradient - Inspired by Shopee's clean navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#4FD1C5] to-[#2D3748] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - MedWira branding with actual logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 flex items-center justify-center transform transition-transform group-hover:scale-110">
                <Image 
                  src="/medwira-logo.png" 
                  alt="MedWira Logo" 
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">MedWira</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/privacy"
                className={`px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'privacy'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className={`px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'terms'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                Terms
              </Link>
              <Link
                href="/terms-of-sale"
                className={`px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'terms-of-sale'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                Sales
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="pt-16 flex">
        {/* Left Sidebar - Table of Contents (Grab-inspired clean list) */}
        <aside
          className={`
            fixed top-16 left-0 h-[calc(100vh-4rem)] w-72 bg-[#2D3748] border-r border-[#4A5568] 
            transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:sticky
          `}
        >
          <div className="p-6">
            <h3 className="text-sm font-semibold text-[#A0AEC0] uppercase tracking-wider mb-4">
              On This Page
            </h3>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-all group flex items-center gap-2
                    ${
                      activeSection === section.id
                        ? 'bg-[#4FD1C5]/20 text-[#4FD1C5] font-medium'
                        : 'text-[#CBD5E0] hover:bg-[#4A5568] hover:text-white'
                    }
                  `}
                >
                  <ChevronRight
                    size={16}
                    className={`transform transition-transform ${
                      activeSection === section.id ? 'translate-x-1' : ''
                    }`}
                  />
                  <span className="text-sm">{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Page Navigation in Sidebar */}
          <div className="lg:hidden border-t border-[#4A5568] p-6">
            <h3 className="text-sm font-semibold text-[#A0AEC0] uppercase tracking-wider mb-4">
              Legal Pages
            </h3>
            <div className="space-y-2">
              <Link
                href="/privacy"
                className="block px-3 py-2 rounded-lg text-sm text-[#CBD5E0] hover:bg-[#4A5568] hover:text-white transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="block px-3 py-2 rounded-lg text-sm text-[#CBD5E0] hover:bg-[#4A5568] hover:text-white transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                Terms of Service
              </Link>
              <Link
                href="/terms-of-sale"
                className="block px-3 py-2 rounded-lg text-sm text-[#CBD5E0] hover:bg-[#4A5568] hover:text-white transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                Terms of Sale
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Page Title with Teal Accent */}
            <div className="mb-12 animate-fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-[#4FD1C5] to-[#81E6D9] bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-[#A0AEC0] text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-[#4FD1C5] rounded-full"></span>
                Last Updated: {lastUpdated}
              </p>
            </div>

            {/* Content with Fade-in Animation */}
            <div className="prose prose-invert prose-lg max-w-none animate-fade-in-delayed">
              {children}
            </div>

            {/* Contact Us Button - Shopee-inspired CTA */}
            <div className="mt-16 p-8 bg-gradient-to-r from-[#4FD1C5]/10 to-[#81E6D9]/10 rounded-2xl border border-[#4FD1C5]/20 text-center animate-fade-in-delayed">
              <h3 className="text-2xl font-semibold text-white mb-3">Have Questions?</h3>
              <p className="text-[#CBD5E0] mb-6">
                Our support team is here to help with any inquiries about our policies.
              </p>
              <a
                href="mailto:support@medwira.com"
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#4FD1C5] text-[#1A202C] font-semibold rounded-lg hover:bg-[#81E6D9] transform hover:scale-105 transition-all shadow-lg hover:shadow-[#4FD1C5]/50"
              >
                <Mail size={20} />
                Contact Support
              </a>
            </div>
          </div>
        </main>
      </div>

      {/* Footer - Grab-inspired centered layout with social icons */}
      <footer className="bg-[#1A202C] border-t border-[#4A5568] mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Company Info */}
            <div className="text-center md:text-left">
              <h4 className="text-lg font-semibold text-white mb-2">MedWira</h4>
              <p className="text-[#A0AEC0] text-sm">
                AI-powered medicine identification for Southeast Asia
              </p>
            </div>

            {/* Quick Links */}
            <div className="text-center">
              <h4 className="text-sm font-semibold text-[#A0AEC0] uppercase tracking-wider mb-3">
                Legal
              </h4>
              <div className="flex flex-col gap-2">
                <Link href="/privacy" className="text-[#CBD5E0] hover:text-[#4FD1C5] transition-colors text-sm">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-[#CBD5E0] hover:text-[#4FD1C5] transition-colors text-sm">
                  Terms of Service
                </Link>
                <Link href="/terms-of-sale" className="text-[#CBD5E0] hover:text-[#4FD1C5] transition-colors text-sm">
                  Terms of Sale
                </Link>
              </div>
            </div>

            {/* Social Media */}
            <div className="text-center md:text-right">
              <h4 className="text-sm font-semibold text-[#A0AEC0] uppercase tracking-wider mb-3">
                Follow Us
              </h4>
              <div className="flex gap-3 justify-center md:justify-end">
                <a
                  href="https://facebook.com/medwira"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#2D3748] flex items-center justify-center text-[#CBD5E0] hover:bg-[#4FD1C5] hover:text-[#1A202C] transition-all transform hover:scale-110"
                  aria-label="Facebook"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href="https://instagram.com/medwira"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#2D3748] flex items-center justify-center text-[#CBD5E0] hover:bg-[#4FD1C5] hover:text-[#1A202C] transition-all transform hover:scale-110"
                  aria-label="Instagram"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://twitter.com/medwira"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#2D3748] flex items-center justify-center text-[#CBD5E0] hover:bg-[#4FD1C5] hover:text-[#1A202C] transition-all transform hover:scale-110"
                  aria-label="Twitter"
                >
                  <Twitter size={20} />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-[#4A5568] text-center">
            <p className="text-[#A0AEC0] text-sm">
              © 2025 MedWira. All rights reserved. |{' '}
              <a href="mailto:support@medwira.com" className="text-[#4FD1C5] hover:underline">
                support@medwira.com
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        /* Smooth fade-in animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-fade-in-delayed {
          animation: fadeIn 0.8s ease-out 0.2s both;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar for sidebar */
        aside::-webkit-scrollbar {
          width: 6px;
        }

        aside::-webkit-scrollbar-track {
          background: #2D3748;
        }

        aside::-webkit-scrollbar-thumb {
          background: #4A5568;
          border-radius: 3px;
        }

        aside::-webkit-scrollbar-thumb:hover {
          background: #4FD1C5;
        }
      `}</style>
    </div>
  );
}

