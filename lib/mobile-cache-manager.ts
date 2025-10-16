'use client';

/**
 * Simplified Mobile Cache Manager
 * Basic localStorage operations with mobile compatibility
 * Removed complex quota management and tracking for better performance
 */
export class MobileCacheManager {
  /**
   * Safely get item from localStorage
   */
  static getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to read from localStorage (${key}):`, error);
      return null;
    }
  }

  /**
   * Safely set item to localStorage
   */
  static setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to write to localStorage (${key}):`, error);
      return false;
    }
  }

  /**
   * Safely remove item from localStorage
   */
  static removeItem(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove from localStorage (${key}):`, error);
      return false;
    }
  }

  /**
   * Clear all localStorage and sessionStorage
   */
  static clearAll(): void {
    try {
      if (typeof window === 'undefined') return;
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      console.log('🧹 Cleared all storage data');
    } catch (error) {
      console.warn('⚠️ Error clearing storage:', error);
    }
  }

  /**
   * Get basic storage info for debugging
   */
  static getStats(): { available: boolean; error?: string } {
    try {
      if (typeof window === 'undefined') {
        return { available: false, error: 'Server-side rendering' };
      }
      
      // Test localStorage availability
      const testKey = '__medwira_test__';
      const testValue = 'test';
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== testValue) {
        return { available: false, error: 'Storage test failed' };
      }
      
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get mobile debug info (simplified)
   */
  static getMobileDebugInfo(): { 
    isMobile: boolean; 
    userAgent: string; 
    storageAvailable: boolean;
  } {
    try {
      if (typeof window === 'undefined') {
        return { isMobile: false, userAgent: 'Server-side', storageAvailable: false };
      }
      
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const stats = this.getStats();
      
      return {
        isMobile,
        userAgent: navigator.userAgent,
        storageAvailable: stats.available
      };
    } catch (error) {
      return { 
        isMobile: false, 
        userAgent: 'Error', 
        storageAvailable: false 
      };
    }
  }
}