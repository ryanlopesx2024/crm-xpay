import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PipelineSidebar from '../pipeline/PipelineSidebar';
import api from '../../services/api';
import { Department } from '../../types';

interface ContextSidebarProps {
  onPipelineSelect?: (pipelineId: string) => void;
  selectedPipelineId?: string;
}

export default function ContextSidebar({ onPipelineSelect, selectedPipelineId }: ContextSidebarProps) {
  const location = useLocation();

  if (location.pathname.startsWith('/pipeline')) {
    return (
      <PipelineSidebar
        onSelect={onPipelineSelect || (() => {})}
        selectedId={selectedPipelineId}
      />
    );
  }

  if (location.pathname.startsWith('/atendimento')) {
    return null;
  }

  if (location.pathname.startsWith('/configuracoes')) {
    return null;
  }

  if (location.pathname.startsWith('/rastreio') ||
      location.pathname.startsWith('/scripts') ||
      location.pathname.startsWith('/disparos') ||
      location.pathname.startsWith('/analises')) {
    return null;
  }

  return null;
}

function AtendimentoSidebar() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  useEffect(() => {
    api.get('/api/departments')
      .then(({ data }) => setDepartments(data))
      .catch(() => {})
      .finally(() => setLoadingDepts(false));
  }, []);

  return (
    <div className="w-[220px] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col p-3 gap-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Filtros</p>
      {['Todas', 'Minhas', 'Sem atendente', 'Bot'].map((f) => (
        <button
          key={f}
          className="text-left text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
        >
          {f}
        </button>
      ))}
      <hr className="border-slate-100 dark:border-slate-700 my-1" />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Departamentos</p>
      {loadingDepts ? (
        <div className="px-3 py-2">
          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mb-2" />
          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mb-2" />
          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      ) : departments.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 px-3 py-2">Nenhum departamento</p>
      ) : (
        departments.map((dept) => (
          <button
            key={dept.id}
            className="text-left text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: dept.color }}
            />
            {dept.name}
          </button>
        ))
      )}
    </div>
  );
}
