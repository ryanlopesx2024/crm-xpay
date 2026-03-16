import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import {
  Building2, Users, Tag, Package, XCircle,
  List, FileText, Clock, Activity, Link2, Wifi, Key
} from 'lucide-react';
import Departamentos from './Departamentos';
import Atendentes from './Atendentes';
import Tags from './Tags';
import Produtos from './Produtos';
import MotivosPerda from './MotivosPerda';
import Listas from './Listas';
import CamposAdicionais from './CamposAdicionais';
import HorariosTrabalho from './HorariosTrabalho';
import TiposAtividade from './TiposAtividade';
import Integracoes from './Integracoes';
import Conexoes from './Conexoes';
import ChavesAPI from './ChavesAPI';

const menuItems = [
  { to: '/configuracoes/departamentos', icon: Building2, label: 'Departamentos' },
  { to: '/configuracoes/atendentes', icon: Users, label: 'Atendentes' },
  { to: '/configuracoes/tags', icon: Tag, label: 'Tags' },
  { to: '/configuracoes/produtos', icon: Package, label: 'Produtos' },
  { to: '/configuracoes/motivos-perda', icon: XCircle, label: 'Motivos de Perda' },
  { to: '/configuracoes/listas', icon: List, label: 'Listas' },
  { to: '/configuracoes/campos-adicionais', icon: FileText, label: 'Campos Adicionais' },
  { to: '/configuracoes/horarios-trabalho', icon: Clock, label: 'Horários de Trabalho' },
  { to: '/configuracoes/tipos-atividade', icon: Activity, label: 'Tipos de Atividade' },
  { to: '/configuracoes/integracoes', icon: Link2, label: 'Integrações' },
  { to: '/configuracoes/conexoes', icon: Wifi, label: 'Conexões' },
  { to: '/configuracoes/chaves-api', icon: Key, label: 'Chaves de API' },
];

export default function Configuracoes() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Config Menu */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Configurações</h2>
        </div>
        <nav className="p-3 space-y-0.5">
          {menuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <Routes>
          <Route path="departamentos" element={<Departamentos />} />
          <Route path="atendentes" element={<Atendentes />} />
          <Route path="tags" element={<Tags />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="motivos-perda" element={<MotivosPerda />} />
          <Route path="listas" element={<Listas />} />
          <Route path="campos-adicionais" element={<CamposAdicionais />} />
          <Route path="horarios-trabalho" element={<HorariosTrabalho />} />
          <Route path="tipos-atividade" element={<TiposAtividade />} />
          <Route path="integracoes" element={<Integracoes />} />
          <Route path="conexoes" element={<Conexoes />} />
          <Route path="chaves-api" element={<ChavesAPI />} />
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Selecione uma opção no menu</p>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </div>
  );
}
