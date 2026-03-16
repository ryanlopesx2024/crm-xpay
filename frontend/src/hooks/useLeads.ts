import { useState, useCallback } from 'react';
import api from '../services/api';
import { Lead } from '../types';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      const { data } = await api.get(`/api/leads${query}`);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLead = useCallback(async (payload: Partial<Lead>) => {
    const { data } = await api.post('/api/leads', payload);
    return data;
  }, []);

  const updateLead = useCallback(async (id: string, payload: Partial<Lead>) => {
    const { data } = await api.put(`/api/leads/${id}`, payload);
    return data;
  }, []);

  const addTag = useCallback(async (leadId: string, tagId: string) => {
    await api.post(`/api/leads/${leadId}/tags`, { tagId });
  }, []);

  const removeTag = useCallback(async (leadId: string, tagId: string) => {
    await api.delete(`/api/leads/${leadId}/tags/${tagId}`);
  }, []);

  return { leads, total, loading, fetchLeads, createLead, updateLead, addTag, removeTag };
}
