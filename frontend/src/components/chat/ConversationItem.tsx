import React from 'react';
import { Conversation } from '../../types';
import Avatar from '../shared/Avatar';
import { Bot, Paperclip, Image, Mic, Clock } from 'lucide-react';
import { differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: () => void;
}

const statusDot: Record<string, string> = {
  OPEN: 'bg-emerald-400',
  PENDING: 'bg-amber-400',
  BOT: 'bg-purple-400',
  RESOLVED: 'bg-slate-300',
};

// SLA thresholds for PENDING (waiting) conversations
function getPendingUrgency(dateStr: string): 'low' | 'medium' | 'high' {
  const mins = differenceInMinutes(new Date(), new Date(dateStr));
  if (mins > 15) return 'high';
  if (mins > 5) return 'medium';
  return 'low';
}

function formatElapsed(dateStr: string) {
  const totalMins = differenceInMinutes(new Date(), new Date(dateStr));
  if (totalMins < 1) return 'agora';
  if (totalMins < 60) return `${totalMins}min`;
  const hours = differenceInHours(new Date(), new Date(dateStr));
  const mins = totalMins - hours * 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
}

function LastMessageIcon({ type }: { type?: string }) {
  if (type === 'AUDIO') return <Mic size={11} className="text-slate-400 flex-shrink-0" />;
  if (type === 'IMAGE') return <Image size={11} className="text-slate-400 flex-shrink-0" />;
  if (type === 'DOCUMENT') return <Paperclip size={11} className="text-slate-400 flex-shrink-0" />;
  return null;
}

export default function ConversationItem({
  conversation, isActive, selectable, selected, onSelect, onClick,
}: ConversationItemProps) {
  const lead = conversation.lead;
  const lastMessage = conversation.messages?.[0];
  const elapsed = formatElapsed(conversation.lastMessageAt);
  const isPending = conversation.status === 'PENDING';
  const isBot = conversation.status === 'BOT';
  const isResolved = conversation.status === 'RESOLVED';
  const urgency = isPending ? getPendingUrgency(conversation.lastMessageAt) : null;

  const urgencyBorder = {
    high: 'border-l-[3px] border-l-red-500',
    medium: 'border-l-[3px] border-l-amber-400',
    low: 'border-l-[3px] border-l-amber-200',
  };

  const getLastMsgText = () => {
    if (!lastMessage) return 'Sem mensagens';
    if (lastMessage.type === 'AUDIO') return '🎵 Mensagem de voz';
    if (lastMessage.type === 'IMAGE') return '📷 Imagem';
    if (lastMessage.type === 'DOCUMENT') return '📎 Documento';
    if (lastMessage.type === 'VIDEO') return '🎬 Vídeo';
    return lastMessage.content || 'Mensagem';
  };

  // Count unread incoming messages
  const unreadCount = conversation.messages?.filter(
    (m) => m.direction === 'IN' && !m.isRead
  ).length || 0;

  return (
    <div
      onClick={selectable ? undefined : onClick}
      className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-150 border-b border-slate-100 dark:border-slate-700/50 ${
        isActive
          ? 'bg-brand-50 dark:bg-brand-900/30 border-l-[3px] border-l-brand-500'
          : isPending && urgency
          ? `hover:bg-slate-50 dark:hover:bg-slate-700/50 ${urgencyBorder[urgency]}`
          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
      }`}
    >
      {/* Checkbox (bulk select) */}
      {selectable && (
        <div
          onClick={(e) => { e.stopPropagation(); onSelect?.(conversation.id); }}
          className={`mt-1 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
            selected ? 'bg-brand-600 border-brand-600' : 'border-slate-300 hover:border-brand-400'
          }`}
        >
          {selected && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}

      {/* Avatar */}
      <div
        onClick={selectable ? onClick : undefined}
        className="relative flex-shrink-0 mt-0.5"
      >
        <Avatar name={lead?.name || '?'} size="md" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${
            statusDot[conversation.status] || 'bg-slate-300'
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={selectable ? onClick : undefined}>
        {/* Name + time row */}
        <div className="flex items-baseline justify-between gap-1">
          <span className={`text-sm font-semibold truncate ${isResolved ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {lead?.name || 'Lead'}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPending && urgency === 'high' && (
              <Clock size={9} className="text-red-500 flex-shrink-0" />
            )}
            <span className={`text-[10px] tabular-nums flex-shrink-0 ${
              isPending && urgency === 'high' ? 'text-red-500 font-semibold' :
              isPending && urgency === 'medium' ? 'text-amber-500 font-medium' :
              'text-slate-400 dark:text-slate-500'
            }`}>{elapsed}</span>
          </div>
        </div>

        {/* Last message - 2 lines */}
        <div className="flex items-start gap-1 mt-0.5">
          {isBot && <Bot size={10} className="text-purple-500 flex-shrink-0 mt-0.5" />}
          <LastMessageIcon type={lastMessage?.type} />
          <p className={`text-xs leading-tight line-clamp-2 flex-1 ${
            unreadCount > 0 ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'
          }`}>
            {getLastMsgText()}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-brand-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ml-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {/* Status badge for PENDING */}
        {isPending && !isActive && (
          <div className="mt-1">
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              urgency === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
              urgency === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
              'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
            }`}>
              <Clock size={8} />
              Aguardando
            </span>
          </div>
        )}

        {/* Tags + instance + user */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {/* Channel instance badge */}
          {conversation.channelInstance && (
            <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
              {conversation.channelInstance.name}
            </span>
          )}
          {/* Department */}
          {conversation.department && (
            <span
              className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: conversation.department.color + '22', color: conversation.department.color, border: `1px solid ${conversation.department.color}44` }}
            >
              {conversation.department.name}
            </span>
          )}
          {/* Tags */}
          {lead?.tags?.slice(0, 2).map(({ tag }) => (
            <span
              key={tag.id}
              className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
            >
              {tag.name}
            </span>
          ))}
          {(lead?.tags?.length || 0) > 2 && (
            <span className="text-[9px] text-slate-400 flex-shrink-0">
              +{(lead?.tags?.length || 0) - 2}
            </span>
          )}
          {/* Assigned user */}
          {conversation.assignedUser && (
            <div className="ml-auto flex-shrink-0" title={conversation.assignedUser.name}>
              <Avatar name={conversation.assignedUser.name} size="xs" />
            </div>
          )}
          {/* Unassigned badge */}
          {!conversation.assignedUser && !isResolved && (
            <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-500 flex-shrink-0 italic">
              Sem atendente
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
