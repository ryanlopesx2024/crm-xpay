import React, { useEffect, useState } from 'react';
import { Trash2, Edit2, Plus } from 'lucide-react';
import api from '../../services/api';
import { LostReason } from '../../types';

export default function MotivosPerda() {
  const [reasons, setReasons] = useState<LostReason[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => { api.get('/api/config/lost-reasons').then(({ data }) => setReasons(data)); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editing) {
      const { data } = await api.put(`/api/config/lost-reasons/${editing}`, { name });
      setReasons((prev) => prev.map((r) => r.id === editing ? data : r));
      setEditing(null);
    } else {
      const { data } = await api.post('/api/config/lost-reasons', { name });
      setReasons((prev) => [...prev, data]);
    }
    setName('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar motivo?')) return;
    await api.delete(`/api/config/lost-reasons/${id}`);
    setReasons((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Motivos de Perda</h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Motivo de perda..." />
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">{editing ? 'Salvar' : 'Adicionar'}</button>
          {editing && <button onClick={() => { setEditing(null); setName(''); }} className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">X</button>}
        </div>
      </div>
      <div className="space-y-2">
        {reasons.map((r) => (
          <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
            <span className="flex-1 text-sm text-gray-900">{r.name}</span>
            <button onClick={() => { setEditing(r.id); setName(r.name); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 size={13} className="text-gray-400" /></button>
            <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
