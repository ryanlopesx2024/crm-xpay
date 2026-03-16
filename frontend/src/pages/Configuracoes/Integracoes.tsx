import React from 'react';
import { ExternalLink, CheckCircle } from 'lucide-react';

const integrations = [
  { name: 'WhatsApp Business API (Meta)', description: 'Conecte a API oficial do WhatsApp Business', connected: false, icon: '💬', color: 'bg-green-50' },
  { name: 'Evolution API', description: 'Integração com Evolution API para WhatsApp unofficial', connected: true, icon: '⚡', color: 'bg-purple-50' },
  { name: 'Correios', description: 'Consulta de CEP e rastreamento de encomendas', connected: false, icon: '📦', color: 'bg-yellow-50' },
  { name: 'Webhook HTTP', description: 'Envie eventos para qualquer URL via webhook', connected: false, icon: '🔗', color: 'bg-blue-50' },
];

export default function Integracoes() {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Integrações</h2>
      <p className="text-sm text-gray-500 mb-6">Conecte o CRM xPay com outras plataformas</p>
      <div className="space-y-3">
        {integrations.map((integ) => (
          <div key={integ.name} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-12 h-12 ${integ.color} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
              {integ.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{integ.name}</p>
                {integ.connected && <CheckCircle size={14} className="text-green-500" />}
              </div>
              <p className="text-xs text-gray-500">{integ.description}</p>
            </div>
            <button className={`px-4 py-1.5 text-sm rounded-xl font-medium transition-colors ${integ.connected ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {integ.connected ? 'Configurar' : 'Conectar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
