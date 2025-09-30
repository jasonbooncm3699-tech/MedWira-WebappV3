'use client';

import React, { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as any);
      
      // Check if PWA is currently running
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
      
      // Device detection for mobile and tablet
      const isMobile = window.innerWidth < 768;
      const isTablet = (window.innerWidth >= 768 && window.innerWidth <= 1366) || 
                       (window.innerHeight >= 768 && window.innerHeight <= 1366);
      const isMobileOrTablet = isMobile || isTablet;
      
      // Show prompt immediately if conditions are met
      if (e && !isPWA && isMobileOrTablet) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          (e as any).prompt();
        }, 100);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Track installation attempts
  useEffect(() => {
    if (deferredPrompt) {
      const handleInstall = async () => {
        try {
          const result = await deferredPrompt.prompt();
          const { outcome } = await result.userChoice;
          
          if (outcome === 'accepted') {
            // Track successful installation
            localStorage.setItem('pwa-installed', 'true');
          } else {
            // Track declined installation
            const attempts = parseInt(localStorage.getItem('pwa-attempts') || '0') + 1;
            localStorage.setItem('pwa-attempts', attempts.toString());
          }
          
          // Clear the deferred prompt
          setDeferredPrompt(null);
        } catch (error) {
          // Track failed installation
          const attempts = parseInt(localStorage.getItem('pwa-attempts') || '0') + 1;
          localStorage.setItem('pwa-attempts', attempts.toString());
        }
      };

      // Auto-trigger install prompt
      handleInstall();
    }
  }, [deferredPrompt]);

  // Handle PWA deletion detection
  useEffect(() => {
    const checkPWAStatus = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
      const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
      
      // If PWA was installed but now running in browser, it was deleted
      if (!isPWA && wasInstalled) {
        localStorage.removeItem('pwa-installed');
      }
    };

    // Check on page load
    checkPWAStatus();
    
    // Check on focus (when user returns to tab)
    window.addEventListener('focus', checkPWAStatus);
    
    return () => {
      window.removeEventListener('focus', checkPWAStatus);
    };
  }, []);

  // This component doesn't render anything - it just handles the native prompt logic
  return null;
}