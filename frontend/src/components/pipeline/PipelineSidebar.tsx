import React, { useEffect, useState, useRef } from 'react';
import { GitBranch, Plus, Trash2, MoreHorizontal, Check, Loader2 } from 'lucide-react';
import { usePipeline } from '../../hooks/usePipeline';
import { Pipeline } from '../../types';
import Avatar from '../shared/Avatar';

interface PipelineSidebarProps {
  onSelect: (pipelineId: string) => void;
  selectedId?: string;
  onCreated?: () => void;
}

export default function PipelineSidebar({ onSelect, selectedId, onCreated }: PipelineSidebarProps) {
  const { pipelines, fetchPipelines, createPipeline, deletePipeline } = usePipeline();
  const [creatingInline, setCreatingInline] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (creatingInline) inputRef.current?.focus();
  }, [creatingInline]);

  const groups = pipelines.reduce<{ user: { id: string; name: string; avatar?: string }; pipelines: Pipeline[] }[]>(
    (acc, pipeline) => {
      const existing = acc.find((g) => g.user.id === pipeline.userId);
      if (existing) existing.pipelines.push(pipeline);
      else acc.push({ user: pipeline.user || { id: pipeline.userId, name: 'Atendente' }, pipelines: [pipeline] });
      return acc;
    }, []
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const pipeline = await createPipeline(newName.trim());
      setCreatingInline(false);
      setNewName('');
      onSelect(pipeline.id);
      onCreated?.();
    } catch (err) { console.error(err); } finally { setCreating(false); }
  };

  const handleDelete = async (pipelineId: string) => {
    if (!confirm('Deletar esta pipeline? Todos os negócios serão perdidos.')) return;
    setMenuOpen(null);
    await deletePipeline(pipelineId);
  };

  const cancelCreate = () => { setCreatingInline(false); setNewName(''); };

  return (
    <div className="w-[220px] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0 h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pipelines</span>
        <button
          onClick={() => setCreatingInline(true)}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: '#00A34D' }}
          title="Nova pipeline"
        >
          <Plus size={13} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">

        {/* Inline create form */}
        {creatingInline && (
          <div className="mb-2 px-2 py-2.5 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
            <p className="text-[10px] font-bold text-brand-700 dark:text-brand-400 mb-2">Nova pipeline</p>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') cancelCreate(); }}
              placeholder="Nome da pipeline..."
              className="w-full text-xs border border-brand-200 dark:border-brand-700 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2 text-slate-800 bg-white"
            />
            <div className="flex gap-1.5">
              <button
                onClick={cancelCreate}
                className="flex-1 py-1.5 text-[11px] text-slate-500 bg-white dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex-1 py-1.5 text-[11px] text-white rounded-lg disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-1"
                style={{ backgroundColor: '#00A34D' }}
              >
                {creating ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                Criar
              </button>
            </div>
          </div>
        )}

        {/* Pipeline list */}
        {groups.map((group) => (
          <div key={group.user.id} className="mb-3">
            <div className="flex items-center gap-1.5 px-2 mb-1">
              <Avatar name={group.user.name} src={group.user.avatar} size="xs" />
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate flex-1">{group.user.name}</span>
            </div>
            {group.pipelines.map((pipeline) => (
              <div key={pipeline.id} className="relative group/item flex items-center">
                <button
                  onClick={() => onSelect(pipeline.id)}
                  className={'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left min-w-0 ' + (selectedId === pipeline.id ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700')}
                >
                  <GitBranch size={11} className="flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{pipeline.name}</span>
                  {pipeline._count !== undefined && (
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {pipeline._count.deals}
                    </span>
                  )}
                </button>
                <div ref={menuRef} className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === pipeline.id ? null : pipeline.id); }}
                    className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all flex-shrink-0"
                  >
                    <MoreHorizontal size={11} className="text-slate-400" />
                  </button>
                  {menuOpen === pipeline.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                      <button
                        onClick={() => handleDelete(pipeline.id)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                      >
                        <Trash2 size={12} /> Deletar pipeline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {pipelines.length === 0 && !creatingInline && (
          <div className="text-center py-8 px-3">
            <GitBranch size={24} className="text-slate-200 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma pipeline</p>
            <button
              onClick={() => setCreatingInline(true)}
              className="mt-2 text-xs font-medium"
              style={{ color: '#00A34D' }}
            >
              Criar primeira pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
