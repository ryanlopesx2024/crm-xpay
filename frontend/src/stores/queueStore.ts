import { create } from 'zustand';
import { Conversation } from '../types';

interface QueueState {
  queue: Conversation[];
  setQueue: (queue: Conversation[]) => void;
  addToQueue: (conv: Conversation) => void;
  removeFromQueue: (conversationId: string) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  queue: [],

  setQueue: (queue) => set({ queue }),

  addToQueue: (conv) =>
    set((state) => ({
      queue: state.queue.some((q) => q.id === conv.id)
        ? state.queue
        : [...state.queue, conv],
    })),

  removeFromQueue: (conversationId) =>
    set((state) => ({
      queue: state.queue.filter((q) => q.id !== conversationId),
    })),
}));
