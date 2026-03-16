import { useState, useCallback } from 'react';
import api from '../services/api';
import { Pipeline, Deal, Stage } from '../types';

export function usePipeline() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/pipelines');
      setPipelines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeals = useCallback(async (pipelineId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/deals?pipelineId=${pipelineId}`);
      setDeals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const moveDeal = useCallback(async (dealId: string, stageId: string) => {
    await api.put(`/api/deals/${dealId}/stage`, { stageId });
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stageId } : d))
    );
  }, []);

  const createDeal = useCallback(async (payload: Partial<Deal>) => {
    const { data } = await api.post('/api/deals', payload);
    setDeals((prev) => [data, ...prev]);
    return data as Deal;
  }, []);

  const updateDeal = useCallback(async (dealId: string, payload: Partial<Deal>) => {
    const { data } = await api.put(`/api/deals/${dealId}`, payload);
    setDeals((prev) => prev.map((d) => (d.id === dealId ? data : d)));
    return data as Deal;
  }, []);

  const wonDealFn = useCallback(async (dealId: string) => {
    const { data } = await api.put(`/api/deals/${dealId}/won`);
    setDeals((prev) => prev.map((d) => (d.id === dealId ? data : d)));
    return data as Deal;
  }, []);

  const lostDealFn = useCallback(async (dealId: string, lostReasonId?: string) => {
    const { data } = await api.put(`/api/deals/${dealId}/lost`, { lostReasonId });
    setDeals((prev) => prev.map((d) => (d.id === dealId ? data : d)));
    return data as Deal;
  }, []);

  const reopenDealFn = useCallback(async (dealId: string) => {
    const { data } = await api.put(`/api/deals/${dealId}/reopen`);
    setDeals((prev) => prev.map((d) => (d.id === dealId ? data : d)));
    return data as Deal;
  }, []);

  const deleteDeal = useCallback(async (dealId: string) => {
    await api.delete(`/api/deals/${dealId}`);
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
  }, []);

  const createPipeline = useCallback(async (name: string) => {
    const { data } = await api.post('/api/pipelines', { name });
    setPipelines((prev) => [...prev, data]);
    return data as Pipeline;
  }, []);

  const deletePipeline = useCallback(async (pipelineId: string) => {
    await api.delete(`/api/pipelines/${pipelineId}`);
    setPipelines((prev) => prev.filter((p) => p.id !== pipelineId));
  }, []);

  const createStage = useCallback(async (pipelineId: string, name: string, color: string) => {
    const { data } = await api.post(`/api/pipelines/${pipelineId}/stages`, {
      name,
      color,
      order: 999,
    });
    setPipelines((prev) =>
      prev.map((p) =>
        p.id === pipelineId ? { ...p, stages: [...(p.stages || []), data] } : p
      )
    );
    return data as Stage;
  }, []);

  const deleteStage = useCallback(async (pipelineId: string, stageId: string) => {
    await api.delete(`/api/pipelines/${pipelineId}/stages/${stageId}`);
    setPipelines((prev) =>
      prev.map((p) =>
        p.id === pipelineId
          ? { ...p, stages: (p.stages || []).filter((s) => s.id !== stageId) }
          : p
      )
    );
    setDeals((prev) => prev.filter((d) => d.stageId !== stageId));
  }, []);

  return {
    pipelines,
    deals,
    loading,
    fetchPipelines,
    fetchDeals,
    moveDeal,
    createDeal,
    updateDeal,
    wonDeal: wonDealFn,
    lostDeal: lostDealFn,
    reopenDeal: reopenDealFn,
    deleteDeal,
    createPipeline,
    deletePipeline,
    createStage,
    deleteStage,
    setPipelines,
    setDeals,
  };
}
