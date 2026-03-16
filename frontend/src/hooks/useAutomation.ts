import { useState, useCallback } from 'react';
import api from '../services/api';
import { Automation } from '../types';

export function useAutomation() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/automations');
      setAutomations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAutomation = useCallback(async (name: string) => {
    const { data } = await api.post('/api/automations', { name });
    setAutomations((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateAutomation = useCallback(async (id: string, payload: Partial<Automation>) => {
    const { data } = await api.put(`/api/automations/${id}`, payload);
    setAutomations((prev) => prev.map((a) => (a.id === id ? data : a)));
    return data;
  }, []);

  const toggleAutomation = useCallback(async (id: string) => {
    const { data } = await api.put(`/api/automations/${id}/toggle`);
    setAutomations((prev) => prev.map((a) => (a.id === id ? data : a)));
    return data;
  }, []);

  const deleteAutomation = useCallback(async (id: string) => {
    await api.delete(`/api/automations/${id}`);
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    automations,
    loading,
    fetchAutomations,
    createAutomation,
    updateAutomation,
    toggleAutomation,
    deleteAutomation,
  };
}
