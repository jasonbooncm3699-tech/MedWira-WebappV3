'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if banner was previously dismissed
    const bannerDismissed = localStorage.getItem('install-banner-dismissed');
    if (bannerDismissed) {
      return;
    }

    // Show banner automatically on mobile/tablet (CSS will handle visibility)
    setShowBanner(true);

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
    
    if (bannerElement) {
      bannerElement.classList.add('slide-up');
      // Add banner-dismissed class to header for smooth animation
      if (headerElement) {
        headerElement.classList.add('banner-dismissed');
      }
      // Hide banner after animation completes
      setTimeout(() => {
        setShowBanner(false);
        localStorage.setItem('install-banner-dismissed', 'true');
      }, 300);
    } else {
      setShowBanner(false);
      localStorage.setItem('install-banner-dismissed', 'true');
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
