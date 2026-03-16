import React, { useEffect, useState } from 'react';
import { Trash2, List } from 'lucide-react';
import api from '../../services/api';
import { LeadList } from '../../types';

export default function Listas() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { api.get('/api/config/lists').then(({ data }) => setLists(data)); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const { data } = await api.post('/api/config/lists', { name });
    setLists((prev) => [...prev, data]);
    setName('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar lista?')) return;
    await api.delete(`/api/config/lists/${id}`);
    setLists((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Listas de Leads</h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da lista..." />
          <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">Criar</button>
        </div>
      </div>
      <div className="space-y-2">
        {lists.map((l) => (
          <div key={l.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <List size={14} className="text-gray-400" />
            <span className="flex-1 text-sm text-gray-900">{l.name}</span>
            <span className="text-xs text-gray-400">{l._count?.members || 0} leads</span>
            <button onClick={() => handleDelete(l.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
