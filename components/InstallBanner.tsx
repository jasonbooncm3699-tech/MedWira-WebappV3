'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkBannerConditions = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const isPermanentlyInstalled = localStorage.getItem('install-banner-dismissed') === 'installed';
      const isMobileOrTablet = window.innerWidth <= 1024;
      
      const shouldShow = !isPWA && !isPermanentlyInstalled && isMobileOrTablet;
      
      console.log('🔍 Banner conditions:', {
        isPWA, 
        isPermanentlyInstalled, 
        isMobileOrTablet, 
        shouldShow,
        screenWidth: window.innerWidth
      });
      
      setShowBanner(shouldShow);
      
      // Apply CSS classes based on banner state
      if (shouldShow) {
        setTimeout(() => {
          const headerElement = document.querySelector('.header');
          const mainContentElement = document.querySelector('.main-content');
          const sideNavElement = document.querySelector('.side-nav');
          
          if (headerElement) {
            headerElement.classList.add('banner-present');
            console.log('📱 Header positioned for banner presence');
          }
          if (mainContentElement) {
            mainContentElement.classList.add('banner-present');
            console.log('📱 Main content positioned for banner presence');
          }
          if (sideNavElement) {
            sideNavElement.classList.add('banner-present');
            console.log('📱 Side nav positioned for banner presence');
          }
        }, 100);
      }
    };

    // Check conditions immediately
    checkBannerConditions();

    // Listen for install prompt only
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('📱 beforeinstallprompt event received');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []); // Empty dependency array - run once only

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
          // Permanently hide banner after successful installation
          localStorage.setItem('install-banner-dismissed', 'installed');
          setShowBanner(false);
        } else {
          console.log('❌ User dismissed the install prompt');
        }
        
        // Clear the deferred prompt
        setDeferredPrompt(null);
      } catch (error) {
        console.error('❌ Install prompt error:', error);
        // Fallback to manual instructions if native prompt fails
        showManualInstallInstructions();
      }
    } else {
      console.log('📱 No native install prompt available - showing manual instructions');
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    // Show manual installation instructions for browsers that don't support beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = '📱 iOS Installation:\n\n1. Tap the Share button (📤) at the bottom\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nYour app will appear on your home screen!';
    } else if (isAndroid) {
      instructions = '📱 Android Installation:\n\n1. Tap the menu button (⋮) in your browser\n2. Look for "Add to Home Screen" or "Install App"\n3. Tap it and confirm the installation\n\nYour app will appear on your home screen!';
    } else {
      instructions = '💻 Desktop Installation:\n\n1. Look for the install icon (⊕) in your browser\'s address bar\n2. Or check the browser menu for "Install App"\n3. Click it to install\n\nYour app will be added to your desktop!';
    }
    
    alert(`Install MedWira AI:\n\n${instructions}`);
  };

  const handleDismiss = () => {
    console.log('❌ Banner dismissed by user');
    
    // Simple dismiss - no storage, banner will show again on refresh
    setShowBanner(false);
    
    // Apply CSS classes for animation
    const headerElement = document.querySelector('.header');
    const mainContentElement = document.querySelector('.main-content');
    const sideNavElement = document.querySelector('.side-nav');
    
    if (headerElement) {
      headerElement.classList.remove('banner-present');
      headerElement.classList.add('banner-dismissed');
      console.log('📱 Header positioned for banner dismissal');
    }
    if (mainContentElement) {
      mainContentElement.classList.remove('banner-present');
      mainContentElement.classList.add('banner-dismissed');
      console.log('📱 Main content positioned for banner dismissal');
    }
    if (sideNavElement) {
      sideNavElement.classList.remove('banner-present');
      sideNavElement.classList.add('banner-dismissed');
      console.log('📱 Side nav positioned for banner dismissal');
    }
  };

  // Don't render if not showing
  if (!showBanner) {
    console.log('🚫 Banner not rendering - showBanner is false');
    return null;
  }

  return (
    <div className="install-banner-top">
      <div className="install-content">
        <span>Install MedWira AI to your home screen!</span>
        <div className="install-actions">
          <button onClick={handleInstall}>
            {deferredPrompt ? 'Install' : 'Install'}
          </button>
          <button className="close-install" onClick={handleDismiss}>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
