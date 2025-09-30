'use client';

import React, { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkPromptConditions = () => {
      // Check if PWA is currently running in standalone mode
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      // Check if PWA was previously installed (even if deleted now)
      const isPermanentlyInstalled = localStorage.getItem('install-banner-dismissed') === 'installed';
      
      // Check if user dismissed the prompt in this session
      const sessionDismissed = sessionStorage.getItem('native-prompt-dismissed') === 'true';
      
      // Device detection for mobile and tablet
      const isMobile = window.innerWidth < 768;
      const isTablet = (window.innerWidth >= 768 && window.innerWidth <= 1366) || 
                       (window.innerHeight >= 768 && window.innerHeight <= 1366);
      const isMobileOrTablet = isMobile || isTablet;
      
      // Only show if PWA not currently installed AND not previously installed AND on mobile/tablet AND not dismissed this session
      const shouldShow = !isPWA && !isPermanentlyInstalled && isMobileOrTablet && !sessionDismissed;
      
      console.log('🔍 Native Prompt Detection:', {
        isPWA: isPWA ? '✅ Currently installed' : '❌ Not currently installed',
        isPermanentlyInstalled: isPermanentlyInstalled ? '✅ Previously installed' : '❌ Never installed',
        sessionDismissed: sessionDismissed ? '✅ Dismissed this session' : '❌ Not dismissed',
        deviceType: isMobile ? '📱 Mobile' : isTablet ? '📱 Tablet' : '💻 Desktop',
        isMobileOrTablet: isMobileOrTablet ? '✅ Mobile/Tablet' : '❌ Desktop',
        shouldShow: shouldShow ? '✅ Show prompt' : '❌ Hide prompt',
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'Landscape' : 'Portrait'
      });
      
      if (shouldShow) {
        // Show prompt after 3 seconds
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    };

    // Check conditions immediately
    checkPromptConditions();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as any);
      console.log('📱 beforeinstallprompt event received');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    console.log('🔧 Install button clicked');
    
    if (deferredPrompt) {
      console.log('📱 Using native install prompt');
      try {
        // Show the native install prompt
        const result = await deferredPrompt.prompt();
        console.log('📱 Install prompt shown');
        
        // Wait for user choice
        const { outcome } = await result.userChoice;
        console.log('📱 User choice:', outcome);
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted the install prompt - PWA will be installed');
          // Permanently hide prompt after successful installation
          localStorage.setItem('install-banner-dismissed', 'installed');
          setShowPrompt(false);
        } else {
          console.log('❌ User dismissed the install prompt');
          // User cancelled - dismiss for this session
          sessionStorage.setItem('native-prompt-dismissed', 'true');
          setShowPrompt(false);
        }
        
        // Clear the deferred prompt
        setDeferredPrompt(null);
      } catch (error) {
        console.error('❌ Install prompt error:', error);
      }
    } else {
      console.log('📱 No native install prompt available');
    }
  };

  const handleDismiss = () => {
    console.log('❌ Prompt dismissed by user');
    
    // Dismiss for this session only
    sessionStorage.setItem('native-prompt-dismissed', 'true');
    setShowPrompt(false);
    setIsDismissed(true);
  };

  // Add swipe-to-dismiss functionality
  useEffect(() => {
    if (!showPrompt) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      // Check if it's a left swipe (deltaX < -50) and not a vertical swipe
      if (deltaX < -50 && Math.abs(deltaY) < 100) {
        console.log('👈 Left swipe detected - dismissing prompt');
        handleDismiss();
      }
    };

    // Add touch event listeners to the document
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showPrompt]);

  // Don't render if not showing
  if (!showPrompt || isDismissed) {
    return null;
  }

  // The native prompt will be triggered by the browser
  // This component just handles the logic and timing
  return null;
}

// Export a function to manually trigger the install prompt
export const triggerInstallPrompt = () => {
  // This can be called from other components if needed
  console.log('🔧 Manual install prompt trigger');
};