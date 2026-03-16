import React from 'react';
import {
  MessageSquare, Tag, GitBranch, CheckCircle,
  Phone, Star, Info, Zap
} from 'lucide-react';
import { LeadHistory } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadTimelineProps {
  history: LeadHistory[];
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  LEAD_CREATED: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
  CONVERSATION_STARTED: { icon: MessageSquare, color: 'text-brand-600', bg: 'bg-brand-50' },
  CONVERSATION_ASSIGNED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  CONVERSATION_RESOLVED: { icon: CheckCircle, color: 'text-slate-600', bg: 'bg-slate-50' },
  TAG_ADDED: { icon: Tag, color: 'text-purple-600', bg: 'bg-purple-50' },
  DEAL_CREATED: { icon: GitBranch, color: 'text-brand-600', bg: 'bg-brand-50' },
  DEAL_STAGE_CHANGED: { icon: GitBranch, color: 'text-amber-600', bg: 'bg-amber-50' },
  AUTOMATION_TRIGGERED: { icon: Zap, color: 'text-brand-600', bg: 'bg-brand-50' },
  DEFAULT: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50' },
};

export default function LeadTimeline({ history }: LeadTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-xs text-slate-400 text-center py-4">Sem histórico</p>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((event, idx) => {
        const cfg = typeConfig[event.type] || typeConfig.DEFAULT;
        const Icon = cfg.icon;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon size={11} className={cfg.color} />
              </div>
              {idx < history.length - 1 && (
                <div className="w-px flex-1 bg-slate-100 my-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-3">
              <p className="text-xs text-slate-700 leading-relaxed">{event.description}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
