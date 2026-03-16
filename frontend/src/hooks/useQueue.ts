import { useEffect, useCallback } from 'react';
import { useQueueStore } from '../stores/queueStore';
import { useSocketEvent } from './useSocket';
import { Conversation } from '../types';

export function useQueue() {
  const { queue, setQueue, addToQueue, removeFromQueue } = useQueueStore();

  useSocketEvent<Conversation[]>('queue_update', useCallback((data) => {
    setQueue(data);
  }, [setQueue]));

  useSocketEvent<{ conversationId: string }>('queue_update_trigger', useCallback(({ conversationId }) => {
    removeFromQueue(conversationId);
  }, [removeFromQueue]));

  useSocketEvent<Conversation>('new_incoming_message', useCallback((data) => {
    if (data.status === 'PENDING') {
      addToQueue(data);
    }
  }, [addToQueue]));

  return { queue, setQueue, addToQueue, removeFromQueue };
}
