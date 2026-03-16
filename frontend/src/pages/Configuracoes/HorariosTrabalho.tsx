import React, { useState } from 'react';
import { Clock } from 'lucide-react';

const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export default function HorariosTrabalho() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    days.map((_, i) => ({
      enabled: i > 0 && i < 6,
      start: '08:00',
      end: '18:00',
    }))
  );

  const updateDay = (idx: number, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule((prev) => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Horários de Trabalho</h2>
      <p className="text-sm text-gray-500 mb-6">Configure os horários de atendimento da sua equipe</p>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {days.map((day, idx) => (
          <div key={day} className={`flex items-center gap-4 px-5 py-4 ${idx < days.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div className="w-24">
              <span className="text-sm font-medium text-gray-700">{day}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${schedule[idx].enabled ? 'bg-blue-500' : 'bg-gray-200'}`}
                onClick={() => updateDay(idx, 'enabled', !schedule[idx].enabled)}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform m-0.5 ${schedule[idx].enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-gray-500">{schedule[idx].enabled ? 'Ativo' : 'Inativo'}</span>
            </label>
            {schedule[idx].enabled && (
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-gray-400" />
                <input type="time" value={schedule[idx].start} onChange={(e) => updateDay(idx, 'start', e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-xs text-gray-400">até</span>
                <input type="time" value={schedule[idx].end} onChange={(e) => updateDay(idx, 'end', e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium transition-colors">
        Salvar horários
      </button>
    </div>
  );
}
