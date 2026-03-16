import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../stores/authStore';

export function useSocket() {
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (user) {
      socketRef.current = getSocket(user.id, user.companyId);
    }
  }, [user]);

  return socketRef.current;
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.id, user.companyId);
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler, user]);
}
