import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Keep backend alive on Render free tier (pings every 4 minutes)
const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
setInterval(() => fetch(`${backendUrl}/health`).catch(() => {}), 4 * 60 * 1000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
