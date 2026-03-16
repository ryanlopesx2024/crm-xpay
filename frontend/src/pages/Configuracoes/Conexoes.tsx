import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Wifi, WifiOff } from 'lucide-react';
import api from '../../services/api';
import { ChannelInstance } from '../../types';

export default function Conexoes() {
  const [channels, setChannels] = useState<ChannelInstance[]>([]);
  const [form, setForm] = useState({ name: '', type: 'WHATSAPP_UNOFFICIAL', identifier: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { api.get('/api/config/channels').then(({ data }) => setChannels(data)); }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.identifier.trim()) return;
    const { data } = await api.post('/api/config/channels', form);
    setChannels((prev) => [...prev, data]);
    setForm({ name: '', type: 'WHATSAPP_UNOFFICIAL', identifier: '' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar conexão?')) return;
    await api.delete(`/api/config/channels/${id}`);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Conexões WhatsApp</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">
          <Plus size={13} />
          Nova conexão
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome da instância</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cloud-8850" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none">
                <option value="WHATSAPP_UNOFFICIAL">WhatsApp (Evolution)</option>
                <option value="WHATSAPP_OFFICIAL">WhatsApp Business API</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Identificador</label>
              <input type="text" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="5511999998850" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">Criar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {channels.map((ch) => (
          <div key={ch.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ch.status === 'CONNECTED' ? 'bg-green-50' : 'bg-gray-50'}`}>
              {ch.status === 'CONNECTED' ? <Wifi size={15} className="text-green-500" /> : <WifiOff size={15} className="text-gray-400" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{ch.name}</p>
              <p className="text-xs text-gray-500">{ch.type === 'WHATSAPP_OFFICIAL' ? 'API Oficial' : 'Evolution API'} • {ch.identifier}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ch.status === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {ch.status}
            </span>
            <button onClick={() => handleDelete(ch.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
