import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import api from '../../services/api';
import { Department } from '../../types';

export default function Departamentos() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', color: '#3b82f6', distributionRule: 'ROUND_ROBIN', description: '' });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/config/departments').then(({ data }) => setDepartments(data)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { data } = await api.put(`/api/config/departments/${editing}`, form);
      setDepartments((prev) => prev.map((d) => d.id === editing ? data : d));
      setEditing(null);
    } else {
      const { data } = await api.post('/api/config/departments', form);
      setDepartments((prev) => [...prev, data]);
    }
    setForm({ name: '', color: '#3b82f6', distributionRule: 'ROUND_ROBIN', description: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar departamento?')) return;
    await api.delete(`/api/config/departments/${id}`);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Departamentos</h2>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          {editing ? 'Editar departamento' : 'Novo departamento'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do departamento"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full h-9 border border-gray-200 rounded-xl cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Distribuição</label>
            <select
              value={form.distributionRule}
              onChange={(e) => setForm({ ...form, distributionRule: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="MANUAL">Manual</option>
              <option value="LEAST_BUSY">Menos ocupado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opcional"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {editing && (
            <button
              onClick={() => { setEditing(null); setForm({ name: '', color: '#3b82f6', distributionRule: 'ROUND_ROBIN', description: '' }); }}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            {editing ? 'Salvar' : 'Criar departamento'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {departments.map((dept) => (
          <div key={dept.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{dept.name}</p>
              <p className="text-xs text-gray-500">{dept.distributionRule} • {dept._count?.conversations || 0} conversas</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Users size={12} />
              {dept.agents?.length || 0} atendentes
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setEditing(dept.id); setForm({ name: dept.name, color: dept.color, distributionRule: dept.distributionRule, description: dept.description || '' }); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 size={13} className="text-gray-400" />
              </button>
              <button onClick={() => handleDelete(dept.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
