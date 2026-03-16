import { useEffect, useCallback } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { useSocketEvent } from './useSocket';
import { Message, Conversation } from '../types';

export function useConversation(conversationId?: string) {
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    fetchConversations,
    setActiveConversation,
    fetchMessages,
    updateConversation,
  } = useConversationStore();

  // NOTE: new_message is handled per-conversation in ChatWindow with proper filtering.
  // Here we only update conversation metadata (last message timestamp).
  useSocketEvent<Message>('new_message', useCallback((message) => {
    // Only update the conversations list metadata, not the messages array
    // (ChatWindow handles adding to messages with conversationId filtering)
    updateConversation(message.conversationId, { lastMessageAt: message.createdAt });
  }, [updateConversation]));

  useSocketEvent<{ conversationId: string; lastMessage: Message }>('conversation_updated', useCallback(({ conversationId: convId, lastMessage }) => {
    updateConversation(convId, { lastMessageAt: lastMessage.createdAt });
  }, [updateConversation]));

  useSocketEvent<Conversation>('conversation_assigned', useCallback((conv) => {
    updateConversation(conv.id, conv);
  }, [updateConversation]));

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    fetchConversations,
    setActiveConversation,
    fetchMessages,
  };
}
