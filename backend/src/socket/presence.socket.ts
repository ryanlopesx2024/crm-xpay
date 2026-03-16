import { Server, Socket } from 'socket.io';
import { prisma } from '../index';

export function setupPresenceSocket(io: Server) {
  io.on('connection', async (socket: Socket) => {
    const { userId, companyId } = socket.handshake.auth;

    if (userId && companyId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'ONLINE' },
        });
        io.to(companyId).emit('user_status', { userId, status: 'ONLINE' });
      } catch {}
    }

    socket.on('update_status', async ({ status }: { status: 'ONLINE' | 'AWAY' | 'OFFLINE' }) => {
      if (!userId) return;
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status },
        });
        io.to(companyId).emit('user_status', { userId, status });
      } catch (err) {
        console.error('Error updating status:', err);
      }
    });

    socket.on('disconnect', async () => {
      if (!userId) return;
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'OFFLINE' },
        });
        io.to(companyId).emit('user_status', { userId, status: 'OFFLINE' });
      } catch {}
    });
  });
}
