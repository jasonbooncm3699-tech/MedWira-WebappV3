/**
 * Chat History Local Storage Utility
 * 
 * Provides localStorage-based chat history persistence for better UX
 * Falls back to database-only mode if localStorage is unavailable
 * Enhanced with mobile-optimized cache management
 */

import { MobileCacheManager } from './mobile-cache-manager';

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'structured';
  content: string;
  timestamp: Date;
  image?: string;
  structuredData?: any;
  rawAnalysis?: string;
}

export interface ChatHistoryData {
  messages: ChatMessage[];
  lastUpdated: string;
  userId?: string;
  version: number;
}

class ChatStorage {
  private readonly STORAGE_KEY = 'medwira_chat_history';
  private readonly VERSION = 1;
  private readonly MAX_MESSAGES = 50; // Limit to prevent storage bloat

  /**
   * Check if localStorage is available and enabled (mobile-optimized)
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      const success = MobileCacheManager.setItem(test, test);
      if (success) {
        MobileCacheManager.removeItem(test);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get user preference for chat storage
   */
  private isStorageEnabled(): boolean {
    if (!this.isLocalStorageAvailable()) return false;
    
    // Check user preference (default: enabled)
    const preference = MobileCacheManager.getItem('medwira_chat_storage_enabled');
    return preference !== 'false';
  }

  /**
   * Save chat messages to localStorage
   */
  saveChatHistory(messages: ChatMessage[], userId?: string): boolean {
    if (!this.isStorageEnabled()) {
      console.log('📱 Chat storage disabled or unavailable');
      return false;
    }

    try {
      // Limit message count to prevent storage bloat
      const limitedMessages = messages.slice(-this.MAX_MESSAGES);
      
      const chatData: ChatHistoryData = {
        messages: limitedMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp // Keep as Date object for serialization
        })),
        lastUpdated: new Date().toISOString(),
        userId,
        version: this.VERSION
      };

      const success = MobileCacheManager.setItem(this.STORAGE_KEY, JSON.stringify(chatData));
      if (success) {
        console.log(`✅ Chat history saved to localStorage (${limitedMessages.length} messages) - mobile optimized`);
        return true;
      } else {
        console.warn('⚠️ Failed to save chat history - quota exceeded or storage unavailable');
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving chat history to localStorage:', error);
      return false;
    }
  }

  /**
   * Load chat messages from localStorage
   */
  loadChatHistory(userId?: string): ChatMessage[] {
    if (!this.isStorageEnabled()) {
      console.log('📱 Chat storage disabled or unavailable');
      return [];
    }

    try {
      const stored = MobileCacheManager.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('📱 No chat history found in localStorage');
        return [];
      }

      const chatData: ChatHistoryData = JSON.parse(stored);
      
      // Validate data structure
      if (!chatData.messages || !Array.isArray(chatData.messages)) {
        console.warn('⚠️ Invalid chat history format in localStorage');
        return [];
      }

      // Check if data is for current user (if userId provided)
      if (userId && chatData.userId && chatData.userId !== userId) {
        console.log('📱 Chat history is for different user, clearing');
        this.clearChatHistory();
        return [];
      }

      // Convert timestamp strings back to Date objects
      const messages: ChatMessage[] = chatData.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      console.log(`✅ Chat history loaded from localStorage (${messages.length} messages)`);
      return messages;
    } catch (error) {
      console.error('❌ Error loading chat history from localStorage:', error);
      this.clearChatHistory(); // Clear corrupted data
      return [];
    }
  }

  /**
   * Add a new message to chat history
   */
  addMessage(message: ChatMessage, userId?: string): boolean {
    const currentMessages = this.loadChatHistory(userId);
    const updatedMessages = [...currentMessages, message];
    return this.saveChatHistory(updatedMessages, userId);
  }

  /**
   * Clear chat history from localStorage
   */
  clearChatHistory(): boolean {
    if (!this.isLocalStorageAvailable()) return false;

    try {
      const success = MobileCacheManager.removeItem(this.STORAGE_KEY);
      if (success) {
        console.log('✅ Chat history cleared from localStorage (mobile optimized)');
        return true;
      } else {
        console.warn('⚠️ Failed to clear chat history');
        return false;
      }
    } catch (error) {
      console.error('❌ Error clearing chat history from localStorage:', error);
      return false;
    }
  }

  /**
   * Get storage info for debugging
   */
  getStorageInfo(): {
    available: boolean;
    enabled: boolean;
    messageCount: number;
    lastUpdated?: string;
    size: number;
  } {
    const available = this.isLocalStorageAvailable();
    const enabled = this.isStorageEnabled();
    
    let messageCount = 0;
    let lastUpdated: string | undefined;
    let size = 0;

    if (available && enabled) {
      try {
        const stored = MobileCacheManager.getItem(this.STORAGE_KEY);
        if (stored) {
          const chatData: ChatHistoryData = JSON.parse(stored);
          messageCount = chatData.messages?.length || 0;
          lastUpdated = chatData.lastUpdated;
          size = stored.length;
        }
      } catch (error) {
        console.error('❌ Error getting storage info:', error);
      }
    }

    return {
      available,
      enabled,
      messageCount,
      lastUpdated,
      size
    };
  }

  /**
   * Enable or disable chat storage
   */
  setStorageEnabled(enabled: boolean): void {
    if (!this.isLocalStorageAvailable()) return;

    const success = MobileCacheManager.setItem('medwira_chat_storage_enabled', enabled.toString());
    if (success) {
      console.log(`📱 Chat storage ${enabled ? 'enabled' : 'disabled'} (mobile optimized)`);
    } else {
      console.warn('⚠️ Failed to save storage preference');
    }
    
    if (!enabled) {
      this.clearChatHistory();
    }
  }
}

// Export singleton instance
export const chatStorage = new ChatStorage();
