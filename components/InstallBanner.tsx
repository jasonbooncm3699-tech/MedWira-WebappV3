'use client';

import React, { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkBannerConditions = () => {
      // Check if PWA is currently running
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
      
      // Check if PWA was previously installed
      const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
      
      // Device detection for mobile and tablet
      const isMobile = window.innerWidth < 768;
      const isTablet = (window.innerWidth >= 768 && window.innerWidth <= 1366) || 
                       (window.innerHeight >= 768 && window.innerHeight <= 1366);
      const isMobileOrTablet = isMobile || isTablet;
      
      // Show banner if not PWA, on mobile/tablet, and not previously installed
      const shouldShow = !isPWA && isMobileOrTablet && !wasInstalled;
      
      setShowBanner(shouldShow);
    };

    // Check conditions immediately
    checkBannerConditions();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as any);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        const result = await deferredPrompt.prompt();
        const { outcome } = await result.userChoice;
        
        if (outcome === 'accepted') {
          localStorage.setItem('pwa-installed', 'true');
          setShowBanner(false);
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Install prompt error:', error);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  // Don't render if not showing
  if (!showBanner) {
    return null;
  }

  return (
    <div className="install-banner">
      <div className="install-content">
        <div className="install-info">
          <div className="install-icon">M</div>
          <div className="install-text">
            <div className="install-title">Install MedWira AI</div>
            <div className="install-url">medwira.com</div>
          </div>
        </div>
        <div className="install-actions">
          <button className="install-btn" onClick={handleInstall}>
            Install
          </button>
          <button className="dismiss-btn" onClick={handleDismiss}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
}