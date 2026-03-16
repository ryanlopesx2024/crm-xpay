import React, { useEffect, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { ActivityType } from '../../types';

export default function TiposAtividade() {
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [form, setForm] = useState({ name: '', icon: 'phone', color: '#3b82f6' });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => { api.get('/api/config/activity-types').then(({ data }) => setTypes(data)); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { data } = await api.put(`/api/config/activity-types/${editing}`, form);
      setTypes((prev) => prev.map((t) => t.id === editing ? data : t));
      setEditing(null);
    } else {
      const { data } = await api.post('/api/config/activity-types', form);
      setTypes((prev) => [...prev, data]);
    }
    setForm({ name: '', icon: 'phone', color: '#3b82f6' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar tipo?')) return;
    await api.delete(`/api/config/activity-types/${id}`);
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Tipos de Atividade</h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex gap-3">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome do tipo" />
          <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none">
            <option value="phone">Ligação</option>
            <option value="mail">E-mail</option>
            <option value="calendar">Reunião</option>
            <option value="check-square">Tarefa</option>
            <option value="message-square">Mensagem</option>
          </select>
          <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-9 border border-gray-200 rounded-xl cursor-pointer" />
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">{editing ? 'Salvar' : 'Criar'}</button>
        </div>
      </div>
      <div className="space-y-2">
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.color + '20', color: t.color }}>
              <span className="text-sm">{t.icon === 'phone' ? '📞' : t.icon === 'mail' ? '📧' : t.icon === 'calendar' ? '📅' : '✅'}</span>
            </div>
            <span className="flex-1 text-sm text-gray-900">{t.name}</span>
            <button onClick={() => { setEditing(t.id); setForm({ name: t.name, icon: t.icon, color: t.color }); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 size={13} className="text-gray-400" /></button>
            <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
