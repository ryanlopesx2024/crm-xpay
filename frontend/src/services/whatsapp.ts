import api from './api';

export const whatsappService = {
  async sendMessage(conversationId: string, content: string, type = 'TEXT') {
    const { data } = await api.post('/api/messages', { conversationId, content, type });
    return data;
  },

  async getConversations(filters?: Record<string, string>) {
    const params = new URLSearchParams(filters);
    const { data } = await api.get(`/api/conversations?${params}`);
    return data;
  },

  async getMessages(conversationId: string) {
    const { data } = await api.get(`/api/messages/${conversationId}`);
    return data;
  },
};
