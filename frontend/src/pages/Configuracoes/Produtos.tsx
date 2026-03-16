import React, { useEffect, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { Product } from '../../types';

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: '', description: '', defaultValue: 0, category: '' });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/config/products').then(({ data }) => setProducts(data));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { data } = await api.put(`/api/config/products/${editing}`, form);
      setProducts((prev) => prev.map((p) => p.id === editing ? data : p));
      setEditing(null);
    } else {
      const { data } = await api.post('/api/config/products', form);
      setProducts((prev) => [...prev, data]);
    }
    setForm({ name: '', description: '', defaultValue: 0, category: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar produto?')) return;
    await api.delete(`/api/config/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Produtos</h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{editing ? 'Editar produto' : 'Novo produto'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valor padrão (R$)</label>
            <input type="number" value={form.defaultValue} onChange={(e) => setForm({ ...form, defaultValue: parseFloat(e.target.value) })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
            <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {editing && <button onClick={() => { setEditing(null); setForm({ name: '', description: '', defaultValue: 0, category: '' }); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">Cancelar</button>}
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">{editing ? 'Salvar' : 'Criar'}</button>
        </div>
      </div>
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-500">{p.category} • R$ {p.defaultValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditing(p.id); setForm({ name: p.name, description: p.description || '', defaultValue: p.defaultValue, category: p.category || '' }); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 size={13} className="text-gray-400" /></button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
