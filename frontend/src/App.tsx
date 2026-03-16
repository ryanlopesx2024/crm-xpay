import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Atendimento from './pages/Atendimento';
import Leads from './pages/Leads';
import Automacoes from './pages/Automacoes';
import Rastreio from './pages/Rastreio';
import Scripts from './pages/Scripts';
import Disparos from './pages/Disparos';
import Analises from './pages/Analises';
import Configuracoes from './pages/Configuracoes';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { isDark } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="atendimento" element={<Atendimento />} />
          <Route path="leads" element={<Leads />} />
          <Route path="automacoes" element={<Automacoes />} />
          <Route path="rastreio" element={<Rastreio />} />
          <Route path="scripts" element={<Scripts />} />
          <Route path="disparos" element={<Disparos />} />
          <Route path="analises" element={<Analises />} />
          <Route path="configuracoes/*" element={<Configuracoes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
