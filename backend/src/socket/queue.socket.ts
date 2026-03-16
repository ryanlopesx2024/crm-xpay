import { Server, Socket } from 'socket.io';
import { prisma } from '../index';

export function setupQueueSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    const { companyId } = socket.handshake.auth;

    socket.on('get_queue', async ({ departmentId }: { departmentId?: string }) => {
      try {
        const where: Record<string, unknown> = { status: 'PENDING' };
        if (departmentId) where.departmentId = departmentId;

        const queue = await prisma.conversation.findMany({
          where,
          include: {
            lead: { select: { id: true, name: true, phone: true } },
            department: { select: { id: true, name: true, color: true } },
          },
          orderBy: { createdAt: 'asc' },
        });

        socket.emit('queue_update', queue);
      } catch (err) {
        console.error('Error fetching queue:', err);
      }
    });

    socket.on('assign_from_queue', async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      try {
        const conversation = await prisma.conversation.update({
          where: { id: conversationId },
          data: { assignedUserId: userId, status: 'OPEN' },
          include: {
            lead: { select: { id: true, name: true } },
            assignedUser: { select: { id: true, name: true } },
          },
        });

        io.to(companyId).emit('conversation_assigned', conversation);
        io.to(companyId).emit('queue_update_trigger', { conversationId });
      } catch (err) {
        console.error('Error assigning from queue:', err);
      }
    });
  });
}
