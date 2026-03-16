import React, { useEffect, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { CustomField } from '../../types';

export default function CamposAdicionais() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [form, setForm] = useState({ name: '', type: 'TEXT' });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => { api.get('/api/config/custom-fields').then(({ data }) => setFields(data)); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { data } = await api.put(`/api/config/custom-fields/${editing}`, form);
      setFields((prev) => prev.map((f) => f.id === editing ? data : f));
      setEditing(null);
    } else {
      const { data } = await api.post('/api/config/custom-fields', form);
      setFields((prev) => [...prev, data]);
    }
    setForm({ name: '', type: 'TEXT' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar campo?')) return;
    await api.delete(`/api/config/custom-fields/${id}`);
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Campos Adicionais</h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex gap-3">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome do campo" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="TEXT">Texto</option>
            <option value="NUMBER">Número</option>
            <option value="DATE">Data</option>
            <option value="BOOLEAN">Booleano</option>
            <option value="SELECT">Seleção</option>
          </select>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">{editing ? 'Salvar' : 'Criar'}</button>
        </div>
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <span className="flex-1 text-sm text-gray-900">{f.name}</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f.type}</span>
            <button onClick={() => { setEditing(f.id); setForm({ name: f.name, type: f.type }); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 size={13} className="text-gray-400" /></button>
            <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
