/**
 * Unified Chat History Manager
 * 
 * Handles all chat interactions (text and image) in a unified way
 * Similar to how ChatGPT/Gemini handle mixed content conversations
 */

import { createClient } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  user_id: string;
  message_type: 'user' | 'ai';
  message_text?: string;
  ai_response?: string;
  session_id: string;
  message_sequence: number;
  image_url?: string;
  medicine_name?: string;
  generic_name?: string;
  dosage?: string;
  side_effects?: string[];
  interactions?: string[];
  warnings?: string[];
  storage?: string;
  category?: string;
  confidence?: number;
  language?: string;
  allergies?: string;
  conversation_context?: string;
  conversation_title?: string;
  conversation_preview?: string;
  conversation_tags?: string[];
  created_at?: string;
}

export interface Conversation {
  id: string;
  session_id: string;
  title: string;
  createdAt: string;
  messageCount: number;
  medicineName?: string;
  imageUrl?: string;
  firstUserMessage: string;
  lastAiMessage: string;
  tags: string[];
}

class ChatHistoryManager {
  private supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  /**
   * Save a chat message to the database
   */
  async saveMessage(messageData: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage | null> {
    try {
      const { data, error } = await this.supabase
        .from('chat_history')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving chat message:', error);
        throw error;
      }

      console.log(`✅ Chat message saved: ${messageData.message_type} in session ${messageData.session_id}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to save chat message:', error);
      return null;
    }
  }

  /**
   * Save a complete conversation (user message + AI response)
   */
  async saveConversation(
    userId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    messageSequence: number,
    extractedData?: {
      medicine_name?: string;
      generic_name?: string;
      side_effects?: string[];
      interactions?: string[];
      warnings?: string[];
      dosage?: string;
      storage?: string;
      category?: string;
      confidence?: number;
    },
    imageUrl?: string,
    language: string = 'English',
    allergies?: string
  ): Promise<boolean> {
    try {
      // Save user message
      await this.saveMessage({
        user_id: userId,
        message_type: 'user',
        message_text: userMessage,
        session_id: sessionId,
        message_sequence: messageSequence,
        image_url: imageUrl,
        language,
        allergies,
        conversation_context: extractedData?.medicine_name ? `Medicine consultation: ${extractedData.medicine_name}` : 'General medical consultation'
      });

      // Save AI response
      await this.saveMessage({
        user_id: userId,
        message_type: 'ai',
        ai_response: aiResponse,
        session_id: sessionId,
        message_sequence: messageSequence + 1,
        medicine_name: extractedData?.medicine_name,
        generic_name: extractedData?.generic_name,
        dosage: extractedData?.dosage,
        side_effects: extractedData?.side_effects,
        interactions: extractedData?.interactions,
        warnings: extractedData?.warnings,
        storage: extractedData?.storage,
        category: extractedData?.category,
        confidence: extractedData?.confidence,
        language,
        allergies,
        conversation_context: extractedData?.medicine_name ? `Medicine analysis: ${extractedData.medicine_name}` : 'Medical consultation'
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save conversation:', error);
      return false;
    }
  }

  /**
   * Get user's chat history grouped by sessions
   */
  async getUserChatHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    searchQuery?: string
  ): Promise<Conversation[]> {
    try {
      let query = this.supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(`message_text.ilike.%${searchQuery}%,ai_response.ilike.%${searchQuery}%,medicine_name.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: chatData, error } = await query;

      if (error) {
        console.error('❌ Error fetching chat history:', error);
        throw error;
      }

      if (!chatData || chatData.length === 0) {
        return [];
      }

      // Group messages by session_id
      const conversations = this.groupMessagesBySession(chatData);
      return conversations;
    } catch (error) {
      console.error('❌ Failed to fetch chat history:', error);
      return [];
    }
  }

  /**
   * Group messages by session into conversation objects
   */
  private groupMessagesBySession(messages: ChatMessage[]): Conversation[] {
    const sessionMap = new Map<string, any>();

    messages.forEach(msg => {
      const sessionId = msg.session_id;
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          id: sessionId,
          session_id: sessionId,
          messages: [],
          createdAt: msg.created_at,
          messageCount: 0,
          firstUserMessage: '',
          lastAiMessage: '',
          medicineName: '',
          imageUrl: ''
        });
      }

      const conversation = sessionMap.get(sessionId);
      conversation.messages.push(msg);
      conversation.messageCount++;

      // Store first user message and last AI message for preview
      if (msg.message_type === 'user' && !conversation.firstUserMessage) {
        conversation.firstUserMessage = msg.message_text || 'Image uploaded';
      }
      if (msg.message_type === 'ai') {
        conversation.lastAiMessage = msg.ai_response || '';
      }

      // Extract medicine and image info
      if (msg.medicine_name) {
        conversation.medicineName = msg.medicine_name;
      }
      if (msg.image_url) {
        conversation.imageUrl = msg.image_url;
      }

      // Update creation time to earliest message
      if (new Date(msg.created_at || '').getTime() < new Date(conversation.createdAt).getTime()) {
        conversation.createdAt = msg.created_at || '';
      }
    });

    // Generate titles and tags for each conversation
    return Array.from(sessionMap.values()).map(conv => ({
      ...conv,
      title: this.generateConversationTitle(conv),
      tags: this.generateConversationTags(conv)
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Generate a title for the conversation using AI logic
   */
  private generateConversationTitle(conversation: any): string {
    // If we have medicine name, use it
    if (conversation.medicineName) {
      return `${conversation.medicineName} Consultation`;
    }

    // Analyze the conversation content for smart title generation
    const firstMessage = conversation.firstUserMessage.toLowerCase();
    const lastAiMessage = conversation.lastAiMessage.toLowerCase();
    
    // Check for specific medical topics
    if (firstMessage.includes('side effect') || lastAiMessage.includes('side effect')) {
      return 'Side Effects Consultation';
    } else if (firstMessage.includes('interaction') || lastAiMessage.includes('interaction')) {
      return 'Drug Interaction Query';
    } else if (firstMessage.includes('dosage') || firstMessage.includes('dose') || lastAiMessage.includes('dosage')) {
      return 'Dosage Consultation';
    } else if (firstMessage.includes('pregnant') || firstMessage.includes('pregnancy') || lastAiMessage.includes('pregnancy')) {
      return 'Pregnancy Safety Query';
    } else if (firstMessage.includes('allergy') || lastAiMessage.includes('allergy')) {
      return 'Allergy Consultation';
    } else if (firstMessage.includes('coffee') || firstMessage.includes('alcohol') || firstMessage.includes('food') || lastAiMessage.includes('interaction')) {
      return 'Food/Drug Interaction';
    } else if (firstMessage.includes('upload') || firstMessage.includes('image') || firstMessage.includes('photo')) {
      return 'Medicine Identification';
    } else if (firstMessage.includes('headache') || firstMessage.includes('pain') || lastAiMessage.includes('pain')) {
      return 'Pain Management Query';
    } else if (firstMessage.includes('cold') || firstMessage.includes('flu') || lastAiMessage.includes('cold')) {
      return 'Cold & Flu Consultation';
    } else if (firstMessage.includes('vitamin') || firstMessage.includes('supplement')) {
      return 'Vitamin & Supplement Query';
    } else {
      // Generate title based on first few words of user message
      const words = conversation.firstUserMessage.split(' ').slice(0, 4).join(' ');
      return words.length > 30 ? 'Medical Consultation' : `${words} Query`;
    }
  }

  /**
   * Generate tags for the conversation
   */
  private generateConversationTags(conversation: any): string[] {
    const tags: string[] = [];

    if (conversation.medicineName) {
      tags.push('Medicine');
    }

    if (conversation.imageUrl) {
      tags.push('Photo');
    }

    if (conversation.firstUserMessage) {
      const message = conversation.firstUserMessage.toLowerCase();
      if (message.includes('interaction') || message.includes('coffee') || message.includes('alcohol') || message.includes('food')) {
        tags.push('Interaction');
      }
      if (message.includes('dosage') || message.includes('dose') || message.includes('take')) {
        tags.push('Dosage');
      }
      if (message.includes('side effect') || message.includes('allergy')) {
        tags.push('Safety');
      }
      if (message.includes('pregnant') || message.includes('pregnancy')) {
        tags.push('Pregnancy');
      }
    }

    return tags.length > 0 ? tags : ['General'];
  }

  /**
   * Get messages for a specific session
   */
  async getSessionMessages(sessionId: string, userId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('message_sequence', { ascending: true });

      if (error) {
        console.error('❌ Error fetching session messages:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch session messages:', error);
      return [];
    }
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return crypto.randomUUID();
  }
}

// Export singleton instance
export const chatHistoryManager = new ChatHistoryManager();
