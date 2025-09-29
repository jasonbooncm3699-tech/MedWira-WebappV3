'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // DEBUG: Log current state
    console.log('🔍 InstallBanner Debug:', {
      screenWidth: window.innerWidth,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      localStorage: localStorage.getItem('install-banner-dismissed'),
      sessionStorage: sessionStorage.getItem('install-banner-dismissed-session')
    });

    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('🚫 Banner hidden: App running as PWA');
      return;
    }

    // Check if app was permanently installed (not just dismissed)
    const bannerPermanentlyDismissed = localStorage.getItem('install-banner-dismissed');
    if (bannerPermanentlyDismissed === 'installed') {
      console.log('🚫 Banner hidden: App was permanently installed');
      return; // Don't show banner if app was actually installed
    }

    // Show banner on mobile and tablet (1024px and below) - PERSISTENT PROMOTION
    const isMobileOrTablet = window.innerWidth <= 1024;
    console.log('📱 Device check:', { isMobileOrTablet, screenWidth: window.innerWidth });
    
    if (isMobileOrTablet) {
      console.log('✅ Banner should show: Mobile/Tablet detected');
      setShowBanner(true);
    } else {
      console.log('🚫 Banner hidden: Desktop detected');
    }

    // Check if banner was dismissed in current session only
    const bannerDismissedThisSession = sessionStorage.getItem('install-banner-dismissed-session');
    if (bannerDismissedThisSession) {
      console.log('🚫 Banner hidden: Dismissed in current session');
      setShowBanner(false);
      // Ensure header is positioned correctly when banner is hidden
      const headerElement = document.querySelector('.header');
      const mainContentElement = document.querySelector('.main-content');
      const sideNavElement = document.querySelector('.side-nav');
      
      if (headerElement) {
        headerElement.classList.add('banner-dismissed');
      }
      if (mainContentElement) {
        mainContentElement.classList.add('banner-dismissed');
      }
      if (sideNavElement) {
        sideNavElement.classList.add('banner-dismissed');
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Permanently hide banner after successful installation
        localStorage.setItem('install-banner-dismissed', 'installed');
        setShowBanner(false);
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    // Add slide-up animation class before hiding
    const bannerElement = document.querySelector('.install-banner-top');
    const headerElement = document.querySelector('.header');
    const mainContentElement = document.querySelector('.main-content');
    const sideNavElement = document.querySelector('.side-nav');
    
    if (bannerElement) {
      bannerElement.classList.add('slide-up');
      // Add banner-dismissed class to header for smooth animation
      if (headerElement) {
        headerElement.classList.add('banner-dismissed');
      }
      // Add banner-dismissed class to main content for spacing adjustment
      if (mainContentElement) {
        mainContentElement.classList.add('banner-dismissed');
      }
      // Add banner-dismissed class to side nav for positioning adjustment
      if (sideNavElement) {
        sideNavElement.classList.add('banner-dismissed');
      }
      // Hide banner after animation completes
      setTimeout(() => {
        setShowBanner(false);
        // Use sessionStorage instead of localStorage - banner will show again on next visit
        sessionStorage.setItem('install-banner-dismissed-session', 'true');
      }, 300);
    } else {
      setShowBanner(false);
      // Use sessionStorage instead of localStorage - banner will show again on next visit
      sessionStorage.setItem('install-banner-dismissed-session', 'true');
    }
  };

  // Don't render if not showing
  if (!showBanner) return null;

  return (
    <div className="install-banner-top">
      <div className="install-content">
        <span>Install MedWira AI to your home screen!</span>
        <div className="install-actions">
          <button onClick={handleInstall}>
            Install
          </button>
          <button className="close-install" onClick={handleDismiss}>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
