import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreHorizontal, Paperclip, Smile, Mic, Send,
  UserCheck, ArrowRight, CheckCircle, FileText, X, ChevronRight,
  ExternalLink, Phone, Square, EyeOff, ChevronDown, Zap,
} from 'lucide-react';
import { Conversation, Message } from '../../types';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useConversationStore } from '../../stores/conversationStore';
import MessageBubble from './MessageBubble';
import Avatar from '../shared/Avatar';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';

interface ChatWindowProps {
  conversation: Conversation;
  onFinish?: (conversationId: string) => void;
  onUpdate?: (conversationId: string, updates: Partial<Conversation>) => void;
  onHide?: (conversationId: string) => void;
}

// ── Common emojis grid ──
const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩',
  '😏','😢','😭','😤','😡','🤔','🤗','🥺','😴','🤑',
  '👍','👎','👋','🙏','💪','🎉','🔥','❤️','💙','💚',
  '✅','⭐','🎯','📞','💬','📝','🏆','💰','🛒','📦',
];

export default function ChatWindow({ conversation, onFinish, onUpdate, onHide }: ChatWindowProps) {
  const { messages, fetchMessages, addMessage, removeMessage, replaceMessage } = useConversationStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showScripts, setShowScripts] = useState(false);
  const [scripts, setScripts] = useState<{ id: string; title: string; category: string; steps: { order: number; text: string }[] }[]>([]);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTransferAgent, setShowTransferAgent] = useState(false);
  const [showTransferDept, setShowTransferDept] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; color: string }[]>([]);
  const [finishing, setFinishing] = useState(false);

  // Channel selector
  const [channels, setChannels] = useState<{ id: string; name: string; identifier: string; type: string }[]>([]);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const channelPickerRef = useRef<HTMLDivElement>(null);

  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load connected channels once
  useEffect(() => {
    api.get('/api/channels').then(({ data }) => {
      setChannels((data as any[]).filter((c) => c.status === 'CONNECTED'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchMessages(conversation.id);
    const socket = getSocket(user?.id, user?.companyId);
    socket.emit('join_conversation', conversation.id);
    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId === conversation.id) addMessage(msg);
    };
    socket.on('new_message', handleNewMessage);
    return () => {
      socket.emit('leave_conversation', conversation.id);
      socket.off('new_message', handleNewMessage);
    };
  }, [conversation.id]); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false); setShowTransferAgent(false); setShowTransferDept(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
      if (channelPickerRef.current && !channelPickerRef.current.contains(e.target as Node)) setShowChannelPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [text]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Show message immediately (optimistic)
    const tempId = `temp_${Date.now()}`;
    addMessage({
      id: tempId,
      conversationId: conversation.id,
      leadId: conversation.leadId,
      direction: 'OUT',
      type: 'TEXT',
      content,
      isRead: true,
      createdAt: new Date().toISOString(),
      user: user ? { id: user.id, name: user.name, avatar: user.avatar } : undefined,
    });

    try {
      const { data: newMsg } = await api.post('/api/messages', {
        conversationId: conversation.id,
        content,
        type: 'TEXT',
      });
      // Replace optimistic with real message from server
      replaceMessage(tempId, newMsg);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      removeMessage(tempId);
      setText(content); // restore on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText((t) => t + emoji);
    }
  };

  // ── Audio recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert('Não foi possível acessar o microfone.');
    }
  };

  const stopAndSendAudio = async () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false);
    const mr = mediaRecorderRef.current;
    const duration = recordingTime;
    await new Promise<void>((res) => {
      mr.onstop = () => {
        // Stop all mic tracks
        try { mr.stream.getTracks().forEach((t) => t.stop()); } catch {}
        res();
      };
      mr.stop();
    });
    const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
    if (blob.size < 100) return; // too short
    setSending(true);
    try {
      const form = new FormData();
      form.append('file', blob, `audio-${Date.now()}.webm`);
      const { data: upload } = await api.post('/api/upload', form);
      const { data: newMsg } = await api.post('/api/messages', {
        conversationId: conversation.id,
        type: 'AUDIO',
        mediaUrl: upload.url,
        mediaType: mr.mimeType,
        duration,
      });
      addMessage(newMsg);
    } catch (err) {
      console.error('Erro ao enviar áudio:', err);
    } finally {
      setSending(false);
    }
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current.stop();
    setRecording(false);
    audioChunksRef.current = [];
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSending(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data: upload } = await api.post('/api/upload', form);
      const isImage = file.type.startsWith('image/');
      const msgType = isImage ? 'IMAGE' : 'DOCUMENT';
      const { data: newMsg } = await api.post('/api/messages', {
        conversationId: conversation.id,
        type: msgType,
        mediaUrl: upload.url,
        mediaType: file.type,
        content: isImage ? '' : file.name,
      });
      addMessage(newMsg);
    } catch (err) {
      console.error('Erro ao enviar arquivo:', err);
    } finally {
      setSending(false);
    }
  };

  const loadScripts = async () => {
    try { const res = await api.get('/api/scripts'); setScripts(res.data || []); }
    catch { setScripts([]); }
  };

  const handleOpenScripts = () => {
    if (!showScripts) loadScripts();
    setShowScripts(!showScripts);
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await api.put(`/api/conversations/${conversation.id}/finish`);
      onFinish?.(conversation.id);
    } catch (err) { console.error(err); } finally { setFinishing(false); }
  };

  const openTransferAgent = async () => {
    setShowTransferAgent(true); setShowTransferDept(false);
    try { const { data } = await api.get('/api/users'); setAgents(data); }
    catch { setAgents([]); }
  };

  const openTransferDept = async () => {
    setShowTransferDept(true); setShowTransferAgent(false);
    try { const { data } = await api.get('/api/departments'); setDepartments(data); }
    catch { setDepartments([]); }
  };

  const transferToAgent = async (userId: string) => {
    try {
      const { data } = await api.put(`/api/conversations/${conversation.id}/assign`, { userId });
      onUpdate?.(conversation.id, data);
      setShowMoreMenu(false); setShowTransferAgent(false);
    } catch (err) { console.error(err); }
  };

  const transferToDept = async (departmentId: string) => {
    try {
      const { data } = await api.put(`/api/conversations/${conversation.id}/department`, { departmentId });
      onUpdate?.(conversation.id, data);
      setShowMoreMenu(false); setShowTransferDept(false);
    } catch (err) { console.error(err); }
  };

  const hideConversation = () => {
    setShowMoreMenu(false);
    onHide?.(conversation.id);
  };

  const switchChannel = async (channelId: string) => {
    try {
      const { data } = await api.put(`/api/conversations/${conversation.id}/channel`, { channelInstanceId: channelId });
      onUpdate?.(conversation.id, { channelInstance: data.channelInstance, channelInstanceId: data.channelInstanceId });
    } catch (err) { console.error('Erro ao trocar canal:', err); }
    setShowChannelPicker(false);
  };

  const lead = conversation.lead;
  const isResolved = conversation.status === 'RESOLVED';

  // Determine if sender name should show (when consecutive msgs from different users)
  const shouldShowSender = (msg: Message, prev?: Message) => {
    if (msg.direction !== 'OUT') return false;
    if (!msg.user?.name) return false;
    if (!prev || prev.direction !== 'OUT') return true;
    return prev.user?.id !== msg.user.id;
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
        <Avatar name={lead?.name || '?'} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{lead?.name}</p>
            <ExternalLink size={11} className="text-slate-400 flex-shrink-0 cursor-pointer hover:text-brand-500 transition-colors" />

            {/* Channel selector */}
            <div ref={channelPickerRef} className="relative flex-shrink-0">
              <button
                onClick={() => setShowChannelPicker(!showChannelPicker)}
                className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 transition-colors"
              >
                <Zap size={9} />
                {conversation.channelInstance?.name || 'Sem canal'}
                <ChevronDown size={9} />
              </button>

              {showChannelPicker && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1 min-w-[200px]">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trocar canal</p>
                  {channels.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">Nenhum canal conectado</p>
                  )}
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => switchChannel(ch.id)}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors ${
                        conversation.channelInstanceId === ch.id
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${conversation.channelInstanceId === ch.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{ch.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{ch.identifier}</p>
                      </div>
                      {conversation.channelInstanceId === ch.id && <span className="text-emerald-600 text-[10px] font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lead?.phone && (
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Phone size={10} />
                {lead.phone}
              </span>
            )}
            {lead?.phone && conversation.department && (
              <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
            )}
            {conversation.department && (
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: conversation.department.color }} />
                {conversation.department.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
            #{conversation.id.slice(-5).toUpperCase()}
          </span>

          {!isResolved && (
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all shadow-sm disabled:opacity-60"
              style={{ backgroundColor: '#00A34D' }}
            >
              <CheckCircle size={13} />
              {finishing ? 'Finalizando...' : 'Finalizar'}
            </button>
          )}
          {isResolved && (
            <span className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg font-medium">
              Resolvida
            </span>
          )}

          {/* More menu */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => { setShowMoreMenu(!showMoreMenu); setShowTransferAgent(false); setShowTransferDept(false); }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <MoreHorizontal size={15} className="text-slate-500 dark:text-slate-400" />
            </button>

            {showMoreMenu && !showTransferAgent && !showTransferDept && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 min-w-[210px]">
                <button onClick={openTransferAgent} className="flex items-center justify-between w-full px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <UserCheck size={13} className="text-slate-400" />
                    <div className="text-left">
                      <p className="font-medium">Transferir atendente</p>
                      <p className="text-slate-400 text-[10px]">Transferir o atendente da conversa</p>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
                <button onClick={openTransferDept} className="flex items-center justify-between w-full px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <ArrowRight size={13} className="text-slate-400" />
                    <div className="text-left">
                      <p className="font-medium">Transferir departamento</p>
                      <p className="text-slate-400 text-[10px]">Transferir a conversa de departamento</p>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
                <hr className="border-slate-100 dark:border-slate-700 my-1" />
                <button onClick={hideConversation} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <EyeOff size={13} className="text-slate-400" />
                  <div className="text-left">
                    <p className="font-medium">Ocultar conversa</p>
                    <p className="text-slate-400 text-[10px]">Remove da lista temporariamente</p>
                  </div>
                </button>
              </div>
            )}

            {showMoreMenu && showTransferAgent && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 min-w-[200px]">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <button onClick={() => setShowTransferAgent(false)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                    <ChevronRight size={12} className="text-slate-400 rotate-180" />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Transferir atendente</span>
                </div>
                {agents.length === 0
                  ? <p className="text-xs text-slate-400 p-3 text-center">Carregando...</p>
                  : agents.map((a) => (
                    <button key={a.id} onClick={() => transferToAgent(a.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Avatar name={a.name} size="xs" />
                      {a.name}
                    </button>
                  ))
                }
              </div>
            )}

            {showMoreMenu && showTransferDept && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 min-w-[200px]">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <button onClick={() => setShowTransferDept(false)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                    <ChevronRight size={12} className="text-slate-400 rotate-180" />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Transferir departamento</span>
                </div>
                {departments.length === 0
                  ? <p className="text-xs text-slate-400 p-3 text-center">Carregando...</p>
                  : departments.map((d) => (
                    <button key={d.id} onClick={() => transferToDept(d.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      {(conversation.assignedUser || conversation.status === 'PENDING') && (
        <div className="px-4 py-1 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          {conversation.status === 'PENDING' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              ⏳ Aguardando atendimento
            </span>
          )}
          {conversation.assignedUser && (
            <div className="flex items-center gap-1 ml-auto">
              <Avatar name={conversation.assignedUser.name} size="xs" />
              <span>{conversation.assignedUser.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <Phone size={20} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Inicie a conversa abaixo</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showDateSep = !prev || !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt));
          const dateLabel = isToday(new Date(msg.createdAt))
            ? 'Hoje'
            : isYesterday(new Date(msg.createdAt))
            ? 'Ontem'
            : format(new Date(msg.createdAt), "dd 'de' MMMM", { locale: ptBR });
          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex items-center justify-center my-3">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
                    {dateLabel}
                  </span>
                </div>
              )}
              <MessageBubble message={msg} showSender={shouldShowSender(msg, prev)} />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scripts Drawer */}
      {showScripts && (
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Scripts de Vendas</span>
            <button onClick={() => setShowScripts(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <X size={12} className="text-slate-400" />
            </button>
          </div>
          {scripts.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nenhum script encontrado</p>}
          <div className="p-2 space-y-1">
            {scripts.map((script) => (
              <div key={script.id}>
                <button
                  onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight size={12} className={`text-slate-400 transition-transform ${expandedScript === script.id ? 'rotate-90' : ''}`} />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1">{script.title}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{script.category}</span>
                </button>
                {expandedScript === script.id && script.steps && (
                  <div className="ml-6 mb-1 space-y-0.5">
                    {script.steps.sort((a, b) => a.order - b.order).map((step, si) => (
                      <button key={si} onClick={() => { setText(step.text); setShowScripts(false); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                      >
                        {step.order}. {step.text.length > 80 ? step.text.slice(0, 80) + '...' : step.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!isResolved ? (
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-3 flex-shrink-0">

          {/* Recording state */}
          {recording ? (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums flex-1">
                Gravando... {formatRecTime(recordingTime)}
              </span>
              <button onClick={cancelRecording} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Cancelar">
                <X size={15} className="text-red-500" />
              </button>
              <button onClick={stopAndSendAudio} disabled={sending} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60">
                <Send size={13} />
                Enviar
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 px-3 py-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                onChange={handleFileAttach}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
                title="Anexar arquivo"
              >
                <Paperclip size={16} className="text-slate-500 dark:text-slate-400" />
              </button>
              <button
                onClick={handleOpenScripts}
                className={`p-1 rounded-lg transition-colors flex-shrink-0 ${showScripts ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400' : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400'}`}
                title="Scripts de Vendas"
              >
                <FileText size={16} />
              </button>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                rows={1}
                className="flex-1 bg-transparent text-sm resize-none border-0 focus:outline-none min-h-[24px] max-h-32 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-0.5"
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Emoji */}
                <div ref={emojiRef} className="relative">
                  <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={`p-1 rounded-lg transition-colors ${showEmoji ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600' : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400'}`}
                    title="Emojis"
                  >
                    <Smile size={16} />
                  </button>
                  {showEmoji && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 w-64 z-30">
                      <div className="grid grid-cols-10 gap-0.5">
                        {EMOJIS.map((em) => (
                          <button
                            key={em}
                            onClick={() => insertEmoji(em)}
                            className="w-6 h-6 flex items-center justify-center text-base hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mic / Send */}
                {text.trim() ? (
                  <button
                    onClick={sendMessage}
                    disabled={sending}
                    className="w-8 h-8 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition-all shadow-sm"
                  >
                    {sending
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send size={14} className="text-white" />
                    }
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-8 h-8 bg-slate-200 dark:bg-slate-600 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 rounded-xl flex items-center justify-center transition-all text-slate-500 dark:text-slate-400"
                    title="Gravar áudio"
                  >
                    <Mic size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-3 flex-shrink-0 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">Esta conversa foi finalizada</p>
        </div>
      )}
    </div>
  );
}
