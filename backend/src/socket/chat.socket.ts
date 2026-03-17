import { Server, Socket } from 'socket.io';
import { prisma } from '../index';
import { sendCloudTextMessage, getCloudCredsFromConfig } from '../services/whatsapp-cloud.service';
import { sendEvolutionMessage, parseChannelConfig, getCredsFromConfig } from '../services/evolution.service';

export function setupChatSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    const { userId, companyId } = socket.handshake.auth;

    if (companyId) socket.join(companyId);

    socket.on('join_conversation', (convId: string) => {
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
        console.error('[socket] message_read error:', err);
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
          include: {
            lead: true,
            channelInstance: true,
          },
        });
        if (!conversation) return;

        // Salva a mensagem no banco
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

        // Emite para o frontend imediatamente
        io.to(`conv_${data.conversationId}`).emit('new_message', message);
        io.to(companyId).emit('conversation_updated', {
          conversationId: data.conversationId,
          lastMessage: message,
        });

        // ── Envia via API do canal ──────────────────────────────────────────
        if (data.type === 'TEXT' && conversation.lead?.phone && conversation.channelInstance) {
          const channel = conversation.channelInstance;
          const phone   = conversation.lead.phone;

          try {
            if (channel.type === 'WHATSAPP_CLOUD' || channel.type === 'WHATSAPP_CLOUD_MANUAL') {
              const cfg   = JSON.parse(channel.config || '{}');
              const creds = getCloudCredsFromConfig(cfg);
              if (creds.phoneNumberId && creds.accessToken) {
                await sendCloudTextMessage(phone, data.content, creds);
              }
            } else if (channel.type === 'WHATSAPP_EVOLUTION') {
              const cfg   = parseChannelConfig(channel.config);
              const creds = getCredsFromConfig(cfg);
              if (creds.url && creds.key) {
                await sendEvolutionMessage(channel.identifier, phone, data.content, creds);
              }
            }
          } catch (sendErr: any) {
            console.error('[socket] Falha ao enviar via API:', sendErr?.message);
            // Não cancela — mensagem já foi salva no banco e emitida ao frontend
          }
        }
      } catch (err) {
        console.error('[socket] send_message error:', err);
      }
    });
  });
}
