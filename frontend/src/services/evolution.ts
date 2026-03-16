import api from './api';

export const evolutionService = {
  async getChannels() {
    const { data } = await api.get('/api/channels');
    return data;
  },

  async createChannel(payload: Record<string, unknown>) {
    const { data } = await api.post('/api/channels', payload);
    return data;
  },

  async updateChannel(id: string, payload: Record<string, unknown>) {
    const { data } = await api.put(`/api/channels/${id}`, payload);
    return data;
  },

  async deleteChannel(id: string) {
    const { data } = await api.delete(`/api/channels/${id}`);
    return data;
  },
};
