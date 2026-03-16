import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(userId?: string, companyId?: string): Socket {
  if (!socket || !socket.connected) {
    const stored = localStorage.getItem('auth-storage');
    let token = '';
    let uid = userId;
    let cid = companyId;

    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        token = state?.token || '';
        uid = uid || state?.user?.id;
        cid = cid || state?.user?.companyId;
      } catch {}
    }

    socket = io('http://localhost:3001', {
      auth: { token, userId: uid, companyId: cid },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
