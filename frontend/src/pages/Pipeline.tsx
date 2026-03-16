import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePipeline } from '../hooks/usePipeline';
import KanbanBoard from '../components/pipeline/KanbanBoard';
import ChatWindow from '../components/chat/ChatWindow';
import { useConversationStore } from '../stores/conversationStore';
import type { Conversation } from '../types';

interface OutletContext {
  selectedPipelineId?: string;
  setSelectedPipelineId: (id: string) => void;
}

export default function Pipeline() {
  const { selectedPipelineId } = useOutletContext<OutletContext>();
  const {
    pipelines, deals, fetchPipelines, fetchDeals, moveDeal,
    createDeal, updateDeal, wonDeal, lostDeal, reopenDeal, deleteDeal,
    createStage, deleteStage,
  } = usePipeline();

  const { updateConversation } = useConversationStore();
  const [chatConversation, setChatConversation] = useState<Conversation | null>(null);

  const handleOpenChat = useCallback(async (leadId: string) => {
    try {
      const { default: api } = await import('../services/api');
      const { data } = await api.get(`/api/conversations?leadId=${encodeURIComponent(leadId)}`);
      const conv = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (conv) {
        setChatConversation(conv);
      } else {
        // No conversation yet — create one
        const { data: newConv } = await api.post('/api/conversations', { leadId });
        setChatConversation(newConv);
      }
    } catch (err) {
      console.error('Erro ao abrir conversa:', err);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // Re-fetch if selected pipeline was just created in the sidebar and isn't in our list yet
  useEffect(() => {
    if (selectedPipelineId && pipelines.length > 0 && !pipelines.find((p) => p.id === selectedPipelineId)) {
      fetchPipelines();
    }
  }, [selectedPipelineId]); // eslint-disable-line

  useEffect(() => {
    if (selectedPipelineId) {
      fetchDeals(selectedPipelineId);
    } else if (pipelines.length > 0) {
      fetchDeals(pipelines[0].id);
    }
  }, [selectedPipelineId, pipelines, fetchDeals]);

  const activePipeline = pipelines.find((p) =>
    selectedPipelineId ? p.id === selectedPipelineId : true
  ) || pipelines[0];

  if (pipelines.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">Nenhuma pipeline</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Clique em "Nova pipeline" no menu lateral para criar</p>
        </div>
      </div>
    );
  }

  if (!activePipeline) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Selecione uma pipeline no menu lateral</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex">
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          pipeline={activePipeline}
          deals={deals}
          onMoveDeal={moveDeal}
          onCreateDeal={createDeal}
          onUpdateDeal={updateDeal}
          onDeleteDeal={deleteDeal}
          onWonDeal={wonDeal}
          onLostDeal={lostDeal}
          onReopenDeal={reopenDeal}
          onCreateStage={createStage}
          onDeleteStage={deleteStage}
          onOpenChat={handleOpenChat}
        />
      </div>

      {/* Chat panel - floating popup */}
      {chatConversation && (
        <div className="fixed bottom-4 right-4 z-50 w-[420px] h-[560px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <ChatWindow
            conversation={chatConversation}
            onFinish={(id) => updateConversation(id, { status: 'RESOLVED' })}
            onUpdate={(id, updates) => updateConversation(id, updates)}
            onHide={() => setChatConversation(null)}
          />
        </div>
      )}
    </div>
  );
}
