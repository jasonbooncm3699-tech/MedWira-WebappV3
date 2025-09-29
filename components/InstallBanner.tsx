'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(true); // TEMPORARY: Force show for testing

  useEffect(() => {
    // DEBUG: Log current state
    console.log('🔍 InstallBanner Debug:', {
      screenWidth: window.innerWidth,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      localStorage: localStorage.getItem('install-banner-dismissed'),
      sessionStorage: sessionStorage.getItem('install-banner-dismissed-session')
    });

    // STEP 1: Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('🚫 Banner hidden: App running as PWA');
      setShowBanner(false);
      return;
    }

    // STEP 2: Check if app was permanently installed (not just dismissed)
    const bannerPermanentlyDismissed = localStorage.getItem('install-banner-dismissed');
    if (bannerPermanentlyDismissed === 'installed') {
      console.log('🚫 Banner hidden: App was permanently installed');
      setShowBanner(false);
      return;
    }

    // STEP 3: Check device type - only show on mobile/tablet
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
    const isMobileOrTablet = isMobile || isTablet;
    
    console.log('📱 Device check:', { 
      isMobile, 
      isTablet, 
      isMobileOrTablet, 
      screenWidth: window.innerWidth 
    });
    
    if (!isMobileOrTablet) {
      console.log('🚫 Banner hidden: Desktop detected');
      setShowBanner(false);
      return;
    }

    // STEP 4: Check if banner was dismissed in current session
    const bannerDismissedThisSession = sessionStorage.getItem('install-banner-dismissed-session');
    console.log('🔍 Session check:', { 
      bannerDismissedThisSession, 
      sessionStorageEmpty: !bannerDismissedThisSession 
    });
    
    if (bannerDismissedThisSession) {
      console.log('🚫 Banner hidden: Dismissed in current session');
      setShowBanner(false);
      // Ensure header is positioned correctly when banner is hidden
      setTimeout(() => {
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
      }, 100);
      return;
    }

    // STEP 5: All conditions passed - show banner
    console.log('✅ Banner should show: All conditions passed - Fresh page load detected');
    setShowBanner(true);
    
    // Add banner-present class to elements
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

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('📱 beforeinstallprompt event received');
    };

    // Also listen for window load to ensure banner shows on fresh page loads
    const handleWindowLoad = () => {
      console.log('🔄 Window loaded - checking banner state again');
      const sessionDismissed = sessionStorage.getItem('install-banner-dismissed-session');
      if (!sessionDismissed && isMobileOrTablet) {
        console.log('✅ Window load: Banner should show - no session dismissal');
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('load', handleWindowLoad);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('load', handleWindowLoad);
    };
  }, []);

  const handleInstall = async () => {
    console.log('🔧 Install button clicked');
    
    if (deferredPrompt) {
      console.log('📱 Using native install prompt');
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted the install prompt');
          // Permanently hide banner after successful installation
          localStorage.setItem('install-banner-dismissed', 'installed');
          setShowBanner(false);
        } else {
          console.log('❌ User dismissed the install prompt');
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('❌ Install prompt error:', error);
        // Fallback to manual instructions
        showManualInstallInstructions();
      }
    } else {
      console.log('📱 No deferred prompt available - showing manual instructions');
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    // Show manual installation instructions for browsers that don't support beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = 'To install: Tap the Share button (📤) and select "Add to Home Screen"';
    } else if (isAndroid) {
      instructions = 'To install: Tap the menu (⋮) and select "Add to Home Screen" or "Install App"';
    } else {
      instructions = 'To install: Look for the install icon in your browser\'s address bar or menu';
    }
    
    alert(`Install MedWira AI:\n\n${instructions}\n\nAfter installation, the app will be available on your home screen!`);
  };

  const handleDismiss = () => {
    console.log('❌ Banner dismissed by user');
    
    // Add slide-up animation class before hiding
    const bannerElement = document.querySelector('.install-banner-top');
    const headerElement = document.querySelector('.header');
    const mainContentElement = document.querySelector('.main-content');
    const sideNavElement = document.querySelector('.side-nav');
    
    if (bannerElement) {
      console.log('🎬 Starting slide-up animation');
      bannerElement.classList.add('slide-up');
      
      // Remove banner-present and add banner-dismissed class for smooth animation
      if (headerElement) {
        headerElement.classList.remove('banner-present');
        headerElement.classList.add('banner-dismissed');
        console.log('📱 Header positioned for banner dismissal');
      }
      // Remove banner-present and add banner-dismissed class to main content for spacing adjustment
      if (mainContentElement) {
        mainContentElement.classList.remove('banner-present');
        mainContentElement.classList.add('banner-dismissed');
        console.log('📱 Main content positioned for banner dismissal');
      }
      // Remove banner-present and add banner-dismissed class to side nav for positioning adjustment
      if (sideNavElement) {
        sideNavElement.classList.remove('banner-present');
        sideNavElement.classList.add('banner-dismissed');
        console.log('📱 Side nav positioned for banner dismissal');
      }
      
      // Hide banner after animation completes
      setTimeout(() => {
        setShowBanner(false);
        // Use sessionStorage - banner will show again on next page refresh
        sessionStorage.setItem('install-banner-dismissed-session', 'true');
        console.log('✅ Banner hidden and session marked as dismissed');
      }, 300);
    } else {
      setShowBanner(false);
      // Use sessionStorage - banner will show again on next page refresh
      sessionStorage.setItem('install-banner-dismissed-session', 'true');
      console.log('✅ Banner hidden (no animation) and session marked as dismissed');
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
