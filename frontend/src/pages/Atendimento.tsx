import React, { useEffect, useState } from 'react';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../stores/conversationStore';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import LeadPanel from '../components/chat/LeadPanel';
import { MessageSquare } from 'lucide-react';

export default function Atendimento() {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const {
    conversations,
    activeConversation,
    loading,
    fetchConversations,
    setActiveConversation,
  } = useConversation();

  const { updateConversation } = useConversationStore();

  // Reset active conversation each time the page is entered
  useEffect(() => {
    setActiveConversation(null);
    fetchConversations();
  }, []); // eslint-disable-line

  const handleFinish = (conversationId: string) => {
    updateConversation(conversationId, { status: 'RESOLVED' });
    if (activeConversation?.id === conversationId) {
      // keep it selected but show as resolved
    }
  };

  const handleBulkFinish = async (ids: string[]) => {
    const { default: api } = await import('../services/api');
    for (const id of ids) {
      try {
        await api.put(`/api/conversations/${id}/finish`);
        updateConversation(id, { status: 'RESOLVED' });
      } catch (err) {
        console.error('Erro ao finalizar conversa:', err);
      }
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Conversation List */}
      <ConversationList
        conversations={conversations.filter(c => !hiddenIds.has(c.id))}
        activeId={activeConversation?.id}
        onSelect={setActiveConversation}
        loading={loading}
        onBulkFinish={handleBulkFinish}
      />

      {/* Chat Window */}
      {activeConversation ? (
        <div className="flex-1 overflow-hidden min-w-0">
          <ChatWindow
            conversation={activeConversation}
            onFinish={handleFinish}
            onUpdate={(id, updates) => updateConversation(id, updates)}
            onHide={(id) => {
              setHiddenIds(prev => new Set([...prev, id]));
              if (activeConversation?.id === id) setActiveConversation(null);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Selecione uma conversa</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Escolha uma conversa para iniciar o atendimento</p>
          </div>
        </div>
      )}

      {/* Lead Panel */}
      {activeConversation && (
        <LeadPanel conversation={activeConversation} />
      )}
    </div>
  );
}
