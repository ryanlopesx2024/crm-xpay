import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Power, Trash2, Copy, Download, Maximize2, Pencil, Check } from 'lucide-react';
import { Automation } from '../../types';
import BlocksSidebar from './BlocksSidebar';
import ConfigPanel from './ConfigPanel';
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import DelayNode from './nodes/DelayNode';
import GroupNode from './nodes/GroupNode';
import UserInputNode from './nodes/UserInputNode';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  group: GroupNode,
  userinput: UserInputNode,
};

export interface AutomationCanvasProps {
  automation: Automation;
  onSave: (flow: { nodes: Node[]; edges: Edge[] }) => void;
  onToggle: () => void;
  onDelete: () => void;
}

function CanvasInner({ automation, onSave, onToggle, onDelete }: AutomationCanvasProps) {
  const initialNodes = (automation.flow?.nodes || []) as Node[];
  const initialEdges = (automation.flow?.edges || []) as Edge[];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Reset nodes/edges when automation changes
  useEffect(() => {
    setNodes((automation.flow?.nodes || []) as Node[]);
    setEdges((automation.flow?.edges || []) as Edge[]);
    setSelectedNode(null);
  }, [automation.id]); // eslint-disable-line

  // Undo/Redo history
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const historyIndexRef = useRef(0);

  const pushHistory = useCallback(() => {
    const current = { nodes: [...nodes], edges: [...edges] };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(current);
    historyIndexRef.current = historyRef.current.length - 1;
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edgeColor =
        connection.sourceHandle === 'yes' || connection.sourceHandle === 'responded' ? '#3b82f6'
        : connection.sourceHandle === 'no' || connection.sourceHandle === 'timeout' ? '#ef4444'
        : '#94a3b8';
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: edgeColor, strokeWidth: 2 } }, eds));
      setTimeout(pushHistory, 0);
    },
    [setEdges, pushHistory]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData) return;
      try {
        const { nodeType, data } = JSON.parse(rawData);
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const newNode: Node = {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType,
          position,
          data,
          ...(nodeType === 'group' ? { style: { width: 320, height: 220 }, zIndex: -1 } : {}),
        };
        setNodes((nds) => [...nds, newNode]);
        setTimeout(pushHistory, 0);
      } catch (err) {
        console.error('Drop parse error:', err);
      }
    },
    [screenToFlowPosition, setNodes, pushHistory]
  );

  const handleAddNode = useCallback((type: string, data: Record<string, unknown>) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data,
      ...(type === 'group' ? { style: { width: 320, height: 220 }, zIndex: -1 } : {}),
    };
    setNodes((nds) => [...nds, newNode]);
    setTimeout(pushHistory, 0);
  }, [setNodes, pushHistory]);

  // When a node is dropped onto a group, assign parentId so it moves with the group
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      if (draggedNode.type === 'group') return;
      const groupNodes = nodes.filter((n) => n.type === 'group');
      const parent = groupNodes.find((g) => {
        const gw = typeof g.style?.width === 'number' ? g.style.width : 300;
        const gh = typeof g.style?.height === 'number' ? g.style.height : 200;
        return (
          draggedNode.position.x >= g.position.x &&
          draggedNode.position.y >= g.position.y &&
          draggedNode.position.x <= g.position.x + gw &&
          draggedNode.position.y <= g.position.y + gh
        );
      });
      if (parent) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === draggedNode.id
              ? {
                  ...n,
                  parentId: parent.id,
                  extent: 'parent' as const,
                  position: {
                    x: draggedNode.position.x - parent.position.x,
                    y: draggedNode.position.y - parent.position.y,
                  },
                }
              : n
          )
        );
      }
    },
    [nodes, setNodes]
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleSaveNodeConfig = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data } : n));
    setSelectedNode(null);
    setTimeout(pushHistory, 0);
  }, [setNodes, pushHistory]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((ed) => ed.source !== nodeId && ed.target !== nodeId));
    setSelectedNode(null);
    setTimeout(pushHistory, 0);
  }, [setNodes, setEdges, pushHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        setNodes((nds) => {
          const sel = nds.filter((n) => n.selected);
          if (sel.length === 0) return nds;
          const selIds = new Set(sel.map((n) => n.id));
          setEdges((eds) => eds.filter((ed) => !selIds.has(ed.source) && !selIds.has(ed.target) && !ed.selected));
          return nds.filter((n) => !n.selected);
        });
        setEdges((eds) => eds.filter((ed) => !ed.selected));
        setSelectedNode(null);
        setTimeout(pushHistory, 0);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          const state = historyRef.current[historyIndexRef.current];
          setNodes(state.nodes);
          setEdges(state.edges);
        }
      }
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++;
          const state = historyRef.current[historyIndexRef.current];
          setNodes(state.nodes);
          setEdges(state.edges);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setNodes, setEdges, pushHistory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave({ nodes, edges });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-transparent absolute top-0 left-0 right-0 z-10 pointer-events-none">
        {/* Automation name */}
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 drop-shadow-sm">
          {automation.name}
        </h1>

        {/* Floating action toolbar */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-2 py-1.5">
          {/* Toggle active */}
          <button
            onClick={onToggle}
            title={automation.isActive ? 'Desativar' : 'Ativar'}
            className={`p-1.5 rounded-lg transition-colors ${
              automation.isActive
                ? 'text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Power size={15} />
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />

          {/* Copy (placeholder) */}
          <button
            title="Copiar"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Copy size={15} />
          </button>

          {/* Rename (placeholder) */}
          <button
            title="Renomear"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Pencil size={15} />
          </button>

          {/* Download (placeholder) */}
          <button
            title="Exportar"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Download size={15} />
          </button>

          {/* Fullscreen (placeholder) */}
          <button
            title="Tela cheia"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Maximize2 size={15} />
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            title="Salvar"
            className={`p-1.5 rounded-lg transition-colors ${
              saved
                ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
            } disabled:opacity-50`}
          >
            {saved ? <Check size={15} /> : <Save size={15} />}
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />

          {/* Delete */}
          <button
            onClick={onDelete}
            title="Deletar automação"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex flex-1 overflow-hidden">
        <BlocksSidebar onAddNode={handleAddNode} />

        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onNodeDragStop={onNodeDragStop}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={null}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'trigger') return '#10b981';
                if (node.type === 'action') return '#6366f1';
                if (node.type === 'condition') return '#f59e0b';
                if (node.type === 'userinput') return '#8b5cf6';
                return '#94a3b8';
              }}
              className="!bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-xl"
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode as { id: string; type: string; data: Record<string, unknown> }}
            onClose={() => setSelectedNode(null)}
            onSave={handleSaveNodeConfig}
            onDeleteNode={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
}

export default function AutomationCanvas(props: AutomationCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
