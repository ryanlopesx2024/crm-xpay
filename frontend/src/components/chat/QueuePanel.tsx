import React from 'react';
import { Clock, UserCheck } from 'lucide-react';
import { useQueueStore } from '../../stores/queueStore';
import Avatar from '../shared/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function QueuePanel() {
  const { queue, removeFromQueue } = useQueueStore();
  const { user } = useAuthStore();

  const handleAssign = async (conversationId: string) => {
    await api.put(`/api/conversations/${conversationId}/assign`, { userId: user?.id });
    removeFromQueue(conversationId);
  };

  if (queue.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400">
        <Clock size={24} className="mx-auto mb-2 text-gray-300" />
        Fila vazia
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Fila de atendimento ({queue.length})
      </p>
      {queue.map((conv) => (
        <div
          key={conv.id}
          className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-100 hover:border-blue-300 transition-colors"
        >
          <Avatar name={conv.lead?.name || 'Lead'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{conv.lead?.name}</p>
            <p className="text-[10px] text-gray-400">
              {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => handleAssign(conv.id)}
            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            title="Atender"
          >
            <UserCheck size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
