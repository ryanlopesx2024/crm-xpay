import React from 'react';
import { Check, CheckCheck, FileText } from 'lucide-react';
import { Message } from '../../types';
import AudioPlayer from './AudioPlayer';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  showSender?: boolean;
}

export default function MessageBubble({ message, showSender }: MessageBubbleProps) {
  const isOut = message.direction === 'OUT';
  const isSystem = message.type === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const time = format(new Date(message.createdAt), 'HH:mm');

  return (
    <div className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} mb-1`}>
      {/* Sender name */}
      {showSender && message.user?.name && (
        <span
          className={`text-[10px] font-semibold mb-0.5 px-1 ${
            isOut ? '' : 'text-slate-500 dark:text-slate-400'
          }`}
          style={isOut ? { color: '#26d67d' } : undefined}
        >
          {message.user.name}
        </span>
      )}

      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
          isOut
            ? 'rounded-br-sm'
            : 'rounded-bl-sm'
        }`}
        style={isOut
          ? { backgroundColor: '#00A34D', color: '#ffffff' }
          : { backgroundColor: '#e2e8f0', color: '#0f172a' }
        }
      >
        {/* AUDIO */}
        {message.type === 'AUDIO' && (
          <AudioPlayer
            src={message.mediaUrl}
            duration={message.duration}
            isOutgoing={isOut}
          />
        )}

        {/* IMAGE */}
        {message.type === 'IMAGE' && (
          <div className="mb-1">
            {message.mediaUrl ? (
              <img
                src={message.mediaUrl}
                alt="Imagem"
                className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
                onClick={() => window.open(message.mediaUrl, '_blank')}
              />
            ) : (
              <div className="w-48 h-32 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <span className="text-xs text-slate-400">Imagem</span>
              </div>
            )}
            {message.content && (
              <p className="text-sm mt-1">{message.content}</p>
            )}
          </div>
        )}

        {/* DOCUMENT */}
        {message.type === 'DOCUMENT' && (
          <a
            href={message.mediaUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-lg ${isOut ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'} transition-colors`}
          >
            <FileText size={20} className={isOut ? 'text-white' : 'text-brand-500'} />
            <div className="min-w-0">
              <p className="text-xs font-medium break-all">{message.content || 'Documento'}</p>
              <p className={`text-[10px] ${isOut ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>Clique para abrir</p>
            </div>
          </a>
        )}

        {/* TEXT */}
        {(message.type === 'TEXT' || message.type === 'TEMPLATE') && message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-1 mt-0.5"
          style={{ color: isOut ? 'rgba(255,255,255,0.65)' : '#64748b' }}
        >
          <span className="text-[10px]">{time}</span>
          {isOut && (
            message.isRead
              ? <CheckCheck size={12} style={{ color: '#96f3c4' }} />
              : <Check size={12} />
          )}
        </div>
      </div>
    </div>
  );
}
