import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Copy, Key } from 'lucide-react';
import api from '../../services/api';
import { ApiKey } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChavesAPI() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [form, setForm] = useState({ name: '', permissions: ['leads:read'] });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { api.get('/api/config/api-keys').then(({ data }) => setKeys(data)); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const { data } = await api.post('/api/config/api-keys', form);
    setKeys((prev) => [...prev, data]);
    setForm({ name: '', permissions: ['leads:read'] });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Revogar chave de API?')) return;
    await api.delete(`/api/config/api-keys/${id}`);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Chaves de API</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie as chaves de acesso à API do CRM</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">
          <Plus size={13} />
          Nova chave
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome da chave</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Integração ERP" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Permissões</label>
            <div className="flex flex-wrap gap-2">
              {['leads:read', 'leads:write', 'conversations:read', 'conversations:write', 'deals:read', 'deals:write'].map((perm) => (
                <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={(e) => {
                      if (e.target.checked) setForm({ ...form, permissions: [...form.permissions, perm] });
                      else setForm({ ...form, permissions: form.permissions.filter((p) => p !== perm) });
                    }}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-600 font-mono">{perm}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">Gerar chave</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Key size={14} className="text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{k.name}</p>
              <p className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded mt-1 truncate">{k.key}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(k.permissions as string[]).map((p) => (
                  <span key={p} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">{p}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Criada em {format(new Date(k.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                {k.lastUsedAt && ` • Último uso: ${format(new Date(k.lastUsedAt), "dd/MM/yyyy")}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigator.clipboard.writeText(k.key)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                title="Copiar"
              >
                <Copy size={13} className="text-gray-400" />
              </button>
              <button onClick={() => handleDelete(k.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
