import React from 'react';
import { Trash2, Copy } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface NodeActionsProps {
  nodeId: string;
}

export default function NodeActions({ nodeId }: NodeActionsProps) {
  const { getNode, setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((ed) => ed.source !== nodeId && ed.target !== nodeId));
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const node = getNode(nodeId);
    if (!node) return;
    setNodes((nds) => [
      ...nds,
      {
        ...node,
        id: `${node.type}-${Date.now()}`,
        selected: false,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
      },
    ]);
  };

  return (
    <div className="absolute -top-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto">
      <button
        onMouseDown={handleDuplicate}
        className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
        title="Duplicar"
      >
        <Copy size={11} className="text-slate-500 dark:text-slate-400" />
      </button>
      <button
        onMouseDown={handleDelete}
        className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-700 transition-colors"
        title="Excluir"
      >
        <Trash2 size={11} className="text-red-400" />
      </button>
    </div>
  );
}
