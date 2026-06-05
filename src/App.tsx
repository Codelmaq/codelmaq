import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import FleetManager from '@/components/FleetManager';
import LoginPage from '@/app/login/page';
import AguardandoAprovacaoPage from '@/app/aguardando-aprovacao/page';

// -----------------------------------------
// ThemeToggle Component (Botão de Alternância de Tema)
// -----------------------------------------
function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.className = "bg-[#101010] text-[#f0f0f0] transition-colors duration-200";
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.className = "bg-white dark:bg-[#151515] text-gray-800 dark:text-gray-100 transition-colors duration-200";
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-[9999] flex items-center justify-center p-3 rounded-full bg-white dark:bg-[#151515]/10 dark:bg-black/20 backdrop-blur-md border border-yellow-500/20 dark:border-yellow-400/20 text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/5 transition-all duration-300"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 animate-pulse" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}

// -----------------------------------------
// App Routes Configuration
// -----------------------------------------
export default function App() {
  return (
    <HashRouter>
      <ThemeToggle />
      <Routes>
        {/* Redirect Root to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Core Fleet manager views */}
        <Route path="/dashboard" element={<FleetManager initialView="dashboard" />} />
        <Route path="/parte-diaria" element={<FleetManager initialView="daily-logs" />} />
        <Route path="/performance" element={<FleetManager initialView="performance" />} />
        <Route path="/abastecimento" element={<FleetManager initialView="fuel-truck" />} />
        <Route path="/oficina" element={<FleetManager initialView="workshop" />} />
        <Route path="/manutencao" element={<FleetManager initialView="preventive-plans" />} />
        <Route path="/planos" element={<FleetManager initialView="maintenance-plans" />} />
        <Route path="/frota" element={<FleetManager initialView="machines" />} />
        <Route path="/ordens-servico" element={<FleetManager initialView="maintenance" />} />
        <Route path="/relatorios" element={<FleetManager initialView="reports" />} />
        <Route path="/configuracoes" element={<FleetManager initialView="admin" />} />

        {/* Other pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/aguardando-aprovacao" element={<AguardandoAprovacaoPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}
