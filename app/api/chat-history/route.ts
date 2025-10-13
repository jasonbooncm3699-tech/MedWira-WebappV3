import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly in API route
function getSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 [CHAT HISTORY API] Fetching chat history for user:', userId);
    console.log('🔍 [CHAT HISTORY API] Pagination:', { page, limit, offset });

    const supabase = getSupabaseClient();

    // Fetch chat messages grouped by session_id
    const { data: messages, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ [CHAT HISTORY API] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }

    console.log('🔍 [CHAT HISTORY API] Raw messages fetched:', messages?.length || 0);

    // Group messages by session_id
    const conversations = groupMessagesBySession(messages || []);

    console.log('🔍 [CHAT HISTORY API] Conversations grouped:', conversations.length);

    // Get total count for pagination
    const { count } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const totalPages = Math.ceil((count || 0) / limit);

    console.log('✅ [CHAT HISTORY API] Success:', {
      conversations: conversations.length,
      totalMessages: count,
      page,
      totalPages
    });

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        totalPages,
        totalMessages: count || 0
      }
    });

  } catch (error) {
    console.error('❌ [CHAT HISTORY API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to group messages by session_id
function groupMessagesBySession(messages: any[]): any[] {
  const sessionMap = new Map();

  messages.forEach(message => {
    const sessionId = message.session_id;
    
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, {
        session_id: sessionId,
        messages: [],
        created_at: message.created_at,
        updated_at: message.updated_at,
        message_count: 0
      });
    }

    const conversation = sessionMap.get(sessionId);
    conversation.messages.push(message);
    conversation.message_count++;
    
    // Update timestamps
    if (new Date(message.created_at) < new Date(conversation.created_at)) {
      conversation.created_at = message.created_at;
    }
    if (new Date(message.updated_at) > new Date(conversation.updated_at)) {
      conversation.updated_at = message.updated_at;
    }
  });

  // Convert to array and sort by most recent
  const conversations = Array.from(sessionMap.values())
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Generate conversation titles and thumbnails
  return conversations.map(conversation => {
    const firstUserMessage = conversation.messages.find((m: any) => m.message_type === 'user');
    const firstAiMessage = conversation.messages.find((m: any) => m.message_type === 'ai');
    
    return {
      ...conversation,
      title: generateConversationTitle(firstUserMessage, firstAiMessage),
      thumbnail: generateConversationThumbnail(firstUserMessage, firstAiMessage),
      tags: generateConversationTags(conversation.messages)
    };
  });
}

// Generate conversation title from first user message
function generateConversationTitle(userMessage: any, aiMessage: any): string {
  if (!userMessage?.message_text) return 'AI Chat';
  
  const text = userMessage.message_text;
  
  // Extract first sentence or first 50 characters
  const firstSentence = text.split('.')[0];
  const title = firstSentence.length > 50 
    ? firstSentence.substring(0, 50) + '...'
    : firstSentence;
    
  return title || 'AI Chat';
}

// Generate conversation thumbnail/preview
function generateConversationThumbnail(userMessage: any, aiMessage: any): string {
  if (!aiMessage?.ai_response) return '';
  
  const response = aiMessage.ai_response;
  
  // Extract first meaningful sentence
  const sentences = response.split('\n').filter((line: string) => line.trim().length > 0);
  const firstSentence = sentences[0] || '';
  
  return firstSentence.length > 100 
    ? firstSentence.substring(0, 100) + '...'
    : firstSentence;
}

// Generate tags based on conversation content
function generateConversationTags(messages: any[]): string[] {
  const tags = new Set<string>();
  
  messages.forEach(message => {
    const text = message.message_text || message.ai_response || '';
    
    // Simple keyword-based tagging
    if (text.toLowerCase().includes('interaction')) tags.add('INTERACTION');
    if (text.toLowerCase().includes('dosage')) tags.add('DOSAGE');
    if (text.toLowerCase().includes('side effect')) tags.add('SIDE EFFECTS');
    if (text.toLowerCase().includes('allergy')) tags.add('ALLERGY');
    if (text.toLowerCase().includes('surgery')) tags.add('SURGERY');
    if (text.toLowerCase().includes('alcohol')) tags.add('ALCOHOL');
    if (text.toLowerCase().includes('vitamin')) tags.add('VITAMIN');
    if (text.toLowerCase().includes('medicine')) tags.add('MEDICINE');
  });
  
  // Default tag if no specific tags found
  if (tags.size === 0) tags.add('GENERAL');
  
  return Array.from(tags);
}
