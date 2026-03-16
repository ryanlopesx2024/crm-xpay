import { Server, Socket } from 'socket.io';
import { prisma } from '../index';

export function setupChatSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    const { userId, companyId, conversationId } = socket.handshake.auth;

    if (companyId) {
      socket.join(companyId);
    }

    socket.on('join_conversation', async (convId: string) => {
      socket.join(`conv_${convId}`);
    });

    socket.on('leave_conversation', (convId: string) => {
      socket.leave(`conv_${convId}`);
    });

    socket.on('typing', ({ conversationId: convId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conv_${convId}`).emit('typing', { userId, isTyping });
    });

    socket.on('message_read', async ({ conversationId: convId, messageIds }: { conversationId: string; messageIds: string[] }) => {
      try {
        await prisma.message.updateMany({
          where: { id: { in: messageIds } },
          data: { isRead: true, readAt: new Date() },
        });
        socket.to(`conv_${convId}`).emit('messages_read', { userId, messageIds });
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    });

    socket.on('send_message', async (data: {
      conversationId: string;
      content: string;
      type: string;
    }) => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
        });
        if (!conversation) return;

        const message = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            leadId: conversation.leadId,
            userId,
            direction: 'OUT',
            type: (data.type || 'TEXT') as 'TEXT',
            content: data.content,
            isRead: true,
          },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        });

        await prisma.conversation.update({
          where: { id: data.conversationId },
          data: { lastMessageAt: new Date() },
        });

        io.to(`conv_${data.conversationId}`).emit('new_message', message);
        io.to(companyId).emit('conversation_updated', {
          conversationId: data.conversationId,
          lastMessage: message,
        });
      } catch (err) {
        console.error('Error sending message via socket:', err);
      }
    });
  });
}
