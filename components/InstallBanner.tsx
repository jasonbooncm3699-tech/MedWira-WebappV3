'use client';

import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Only show install banner on mobile and tablet devices (not desktop)
    const isMobileOrTablet = window.innerWidth <= 1024;
    console.log('Screen width:', window.innerWidth, 'Is mobile/tablet:', isMobileOrTablet);
    if (!isMobileOrTablet) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if banner was previously dismissed
    const bannerDismissed = localStorage.getItem('install-banner-dismissed');
    if (!bannerDismissed && deferredPrompt) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

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
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('install-banner-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="install-banner-top">
      <div className="install-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} />
          <span>Add MedWira AI to your home screen for faster access!</span>
        </div>
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
