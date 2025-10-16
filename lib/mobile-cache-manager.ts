'use client';

/**
 * Mobile Cache Manager
 * Handles localStorage, sessionStorage, and cache quotas for mobile devices
 * Provides fallback strategies and error handling for mobile browsers
 */

interface CacheQuota {
  used: number;
  available: number;
  total: number;
}

interface CacheItem {
  key: string;
  value: string;
  size: number;
  timestamp: number;
}

export class MobileCacheManager {
  private static readonly MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit
  private static readonly MAX_ITEMS = 100;
  private static readonly CLEANUP_THRESHOLD = 0.8; // Clean when 80% full

  /**
   * Get current cache quota information
   */
  static async getQuota(): Promise<CacheQuota | null> {
    if (typeof window === 'undefined') return null;

    try {
      // Estimate localStorage usage
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Get quota information if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used,
          available: (estimate.quota || this.MAX_CACHE_SIZE) - used,
          total: estimate.quota || this.MAX_CACHE_SIZE
        };
      }

      // Fallback estimation
      return {
        used,
        available: this.MAX_CACHE_SIZE - used,
        total: this.MAX_CACHE_SIZE
      };
    } catch (error) {
      console.warn('⚠️ Failed to get cache quota:', error);
      return null;
    }
  }

  /**
   * Safe localStorage set with quota management
   */
  static setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      // Check if we need to clean up
      const quota = this.getQuotaSync();
      if (quota && quota.used / quota.total > this.CLEANUP_THRESHOLD) {
        this.cleanupOldItems();
      }

      // Check if adding this item would exceed quota
      const itemSize = key.length + value.length;
      if (quota && quota.available < itemSize) {
        console.warn('⚠️ Not enough cache space, cleaning up...');
        this.cleanupOldItems();
      }

      localStorage.setItem(key, value);
      
      // Track item for cleanup
      this.trackItem(key, value, itemSize);
      
      console.log('✅ Cache item set:', key, `${itemSize} bytes`);
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to set cache item:', key, error);
      
      // Try to clean up and retry
      this.cleanupOldItems();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('❌ Failed to set cache item after cleanup:', key, retryError);
        return false;
      }
    }
  }

  /**
   * Safe localStorage get with fallback
   */
  static getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('⚠️ Failed to get cache item:', key, error);
      return null;
    }
  }

  /**
   * Safe localStorage remove
   */
  static removeItem(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      this.untrackItem(key);
      console.log('✅ Cache item removed:', key);
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to remove cache item:', key, error);
      return false;
    }
  }

  /**
   * Clear all cache with mobile-optimized cleanup
   */
  static clearAll(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear tracked items
      this.clearTrackedItems();
      
      console.log('🧹 All cache cleared');
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getStats(): { itemCount: number; totalSize: number; quota: CacheQuota | null } {
    if (typeof window === 'undefined') {
      return { itemCount: 0, totalSize: 0, quota: null };
    }

    try {
      const quota = this.getQuotaSync();
      const trackedItems = this.getTrackedItems();
      
      return {
        itemCount: trackedItems.length,
        totalSize: trackedItems.reduce((sum, item) => sum + item.size, 0),
        quota
      };
    } catch (error) {
      console.warn('⚠️ Failed to get cache stats:', error);
      return { itemCount: 0, totalSize: 0, quota: null };
    }
  }

  /**
   * Mobile-specific debugging information
   */
  static getMobileDebugInfo(): object {
    if (typeof window === 'undefined') {
      return { error: 'Not in browser environment' };
    }

    try {
      const stats = this.getStats();
      const userAgent = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      return {
        isMobile,
        userAgent: userAgent.substring(0, 100) + '...',
        cacheStats: stats,
        localStorageKeys: Object.keys(localStorage),
        sessionStorageKeys: Object.keys(sessionStorage),
        cookies: document.cookie,
        cookieCount: document.cookie.split(';').filter(c => c.trim()).length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Private methods

  private static getQuotaSync(): CacheQuota | null {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      
      return {
        used,
        available: this.MAX_CACHE_SIZE - used,
        total: this.MAX_CACHE_SIZE
      };
    } catch (error) {
      return null;
    }
  }

  private static trackItem(key: string, value: string, size: number): void {
    try {
      const tracked = this.getTrackedItems();
      const item: CacheItem = {
        key,
        value,
        size,
        timestamp: Date.now()
      };
      
      // Remove existing item if it exists
      const filtered = tracked.filter(i => i.key !== key);
      filtered.push(item);
      
      // Keep only the most recent items
      if (filtered.length > this.MAX_ITEMS) {
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        filtered.splice(this.MAX_ITEMS);
      }
      
      sessionStorage.setItem('medwira_cache_tracker', JSON.stringify(filtered));
    } catch (error) {
      console.warn('⚠️ Failed to track cache item:', error);
    }
  }

  private static untrackItem(key: string): void {
    try {
      const tracked = this.getTrackedItems();
      const filtered = tracked.filter(item => item.key !== key);
      sessionStorage.setItem('medwira_cache_tracker', JSON.stringify(filtered));
    } catch (error) {
      console.warn('⚠️ Failed to untrack cache item:', error);
    }
  }

  private static getTrackedItems(): CacheItem[] {
    try {
      const tracked = sessionStorage.getItem('medwira_cache_tracker');
      return tracked ? JSON.parse(tracked) : [];
    } catch (error) {
      return [];
    }
  }

  private static clearTrackedItems(): void {
    try {
      sessionStorage.removeItem('medwira_cache_tracker');
    } catch (error) {
      console.warn('⚠️ Failed to clear tracked items:', error);
    }
  }

  private static cleanupOldItems(): void {
    try {
      const tracked = this.getTrackedItems();
      const quota = this.getQuotaSync();
      
      if (!quota || tracked.length === 0) return;
      
      // Sort by timestamp (oldest first)
      tracked.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest items until we have enough space
      let removedSize = 0;
      const targetSize = quota.total * 0.5; // Clean to 50% usage
      
      for (const item of tracked) {
        if (quota.used - removedSize <= targetSize) break;
        
        try {
          localStorage.removeItem(item.key);
          removedSize += item.size;
        } catch (error) {
          console.warn('⚠️ Failed to remove item during cleanup:', item.key, error);
        }
      }
      
      // Update tracking
      const remaining = tracked.filter(item => {
        try {
          return localStorage.getItem(item.key) !== null;
        } catch {
          return false;
        }
      });
      
      sessionStorage.setItem('medwira_cache_tracker', JSON.stringify(remaining));
      
      console.log('🧹 Cache cleanup completed:', {
        removedSize: `${Math.round(removedSize / 1024)}KB`,
        remainingItems: remaining.length
      });
    } catch (error) {
      console.warn('⚠️ Failed to cleanup cache:', error);
    }
  }
}
