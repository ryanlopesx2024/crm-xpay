import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ContextSidebar from './ContextSidebar';

export default function AppLayout() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>();
  const location = useLocation();

  const showContextSidebar =
    location.pathname.startsWith('/pipeline') ||
    location.pathname.startsWith('/atendimento');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      {showContextSidebar && (
        <ContextSidebar
          onPipelineSelect={setSelectedPipelineId}
          selectedPipelineId={selectedPipelineId}
        />
      )}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet context={{ selectedPipelineId, setSelectedPipelineId }} />
      </main>
    </div>
  );
}
