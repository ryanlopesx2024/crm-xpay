import { create } from 'zustand';
import { Conversation, Message } from '../types';
import api from '../services/api';

interface ConversationState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  fetchConversations: (filters?: Record<string, string>) => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  replaceMessage: (tempId: string, message: Message) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,

  fetchConversations: async (filters) => {
    set({ loading: true });
    try {
      const params = filters ? `?${new URLSearchParams(filters)}` : '';
      const { data } = await api.get(`/api/conversations${params}`);
      set({ conversations: data });
    } catch (err) {
      console.error(err);
    } finally {
      set({ loading: false });
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, messages: [] });
  },

  fetchMessages: async (conversationId) => {
    try {
      const { data } = await api.get(`/api/messages/${conversationId}`);
      // Only update messages if they're still for this conversation
      set((state) => ({
        messages: state.activeConversation?.id === conversationId ? data : state.messages,
      }));
    } catch (err) {
      console.error(err);
    }
  },

  addMessage: (message) => {
    set((state) => ({
      messages: state.messages.some((m) => m.id === message.id)
        ? state.messages
        : [...state.messages, message],
      conversations: state.conversations.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessageAt: message.createdAt }
          : c
      ),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));
  },

  replaceMessage: (tempId, message) => {
    set((state) => {
      const alreadyExists = state.messages.some((m) => m.id === message.id);
      return {
        messages: alreadyExists
          ? state.messages.filter((m) => m.id !== tempId)
          : state.messages.map((m) => (m.id === tempId ? message : m)),
      };
    });
  },

  updateConversation: (conversationId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...updates } : c
      ),
      activeConversation:
        state.activeConversation?.id === conversationId
          ? { ...state.activeConversation, ...updates }
          : state.activeConversation,
    }));
  },
}));
