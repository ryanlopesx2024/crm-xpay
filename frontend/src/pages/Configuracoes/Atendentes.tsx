import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { User } from '../../types';
import Avatar from '../../components/shared/Avatar';

export default function Atendentes() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT', maxConversations: 10 });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/users').then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editing) {
      const { data } = await api.put(`/api/users/${editing}`, form);
      setUsers((prev) => prev.map((u) => u.id === editing ? data : u));
      setEditing(null);
    } else {
      const { data } = await api.post('/api/users', form);
      setUsers((prev) => [...prev, data]);
    }
    setForm({ name: '', email: '', password: '', role: 'AGENT', maxConversations: 10 });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar atendente?')) return;
    await api.delete(`/api/users/${id}`);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const statusColors = { ONLINE: 'text-green-500', AWAY: 'text-yellow-500', OFFLINE: 'text-gray-400' };

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Atendentes</h2>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{editing ? 'Editar atendente' : 'Novo atendente'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@crmxpay.com" />
          </div>
          {!editing && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Perfil</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="AGENT">Atendente</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Máx. conversas</label>
            <input type="number" value={form.maxConversations} onChange={(e) => setForm({ ...form, maxConversations: parseInt(e.target.value) })} min={1} max={50} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {editing && <button onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'AGENT', maxConversations: 10 }); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>}
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-medium">{editing ? 'Salvar' : 'Criar atendente'}</button>
        </div>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <Avatar name={user.name} src={user.avatar} size="md" status={user.status} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email} • {user.role}</p>
            </div>
            <span className={`text-xs font-medium ${statusColors[user.status]}`}>{user.status}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditing(user.id); setForm({ name: user.name, email: user.email, password: '', role: user.role, maxConversations: user.maxConversations }); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <Edit2 size={13} className="text-gray-400" />
              </button>
              <button onClick={() => handleDelete(user.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
