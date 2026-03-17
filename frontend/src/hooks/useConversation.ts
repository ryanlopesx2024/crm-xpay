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
    addConversation,
  } = useConversationStore();

  // Nova conversa chegou via Evolution webhook
  useSocketEvent<{ conversation: Conversation; message: Message }>(
    'new_conversation',
    useCallback(({ conversation }) => {
      addConversation(conversation);
    }, [addConversation])
  );

  // Mensagem em conversa existente → atualiza lastMessageAt e move pro topo
  useSocketEvent<{ conversationId: string; message: Message; lead: unknown }>(
    'new_incoming_message',
    useCallback(({ conversationId: convId, message }) => {
      updateConversation(convId, {
        lastMessageAt: message.createdAt,
        status: 'PENDING',
      });
    }, [updateConversation])
  );

  // Mensagem enviada ou recebida dentro de uma conversa aberta
  useSocketEvent<Message>('new_message', useCallback((message) => {
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
