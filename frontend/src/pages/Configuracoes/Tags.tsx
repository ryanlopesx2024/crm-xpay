import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { Tag } from '../../types';
import TagPill from '../../components/shared/TagPill';

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState({ name: '', color: '#3b82f6' });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/config/tags').then(({ data }) => setTags(data));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { data } = await api.put(`/api/config/tags/${editing}`, form);
      setTags((prev) => prev.map((t) => t.id === editing ? data : t));
      setEditing(null);
    } else {
      const { data } = await api.post('/api/config/tags', form);
      setTags((prev) => [...prev, data]);
    }
    setForm({ name: '', color: '#3b82f6' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar tag?')) return;
    await api.delete(`/api/config/tags/${id}`);
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Tags</h2>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{editing ? 'Editar tag' : 'Nova tag'}</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: PT1, Cloud-8850"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-9 border border-gray-200 rounded-xl cursor-pointer" />
          </div>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-medium">
            {editing ? 'Salvar' : 'Criar'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm({ name: '', color: '#3b82f6' }); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          )}
        </div>

        {form.name && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            <TagPill name={form.name} color={form.color} />
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2">
            <TagPill name={tag.name} color={tag.color} />
            <span className="text-xs text-gray-400">{tag._count?.leads || 0} leads</span>
            <button onClick={() => { setEditing(tag.id); setForm({ name: tag.name, color: tag.color }); }} className="p-1 hover:bg-gray-100 rounded-lg">
              <Edit2 size={11} className="text-gray-400" />
            </button>
            <button onClick={() => handleDelete(tag.id)} className="p-1 hover:bg-red-50 rounded-lg">
              <Trash2 size={11} className="text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
