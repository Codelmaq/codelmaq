import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import FleetManager from '@/components/FleetManager';
import LoginPage from '@/app/login/page';
import AguardandoAprovacaoPage from '@/app/aguardando-aprovacao/page';

// -----------------------------------------
// App Routes Configuration
// -----------------------------------------
export default function App() {
  return (
    <HashRouter>
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
        <Route path="/qr-codes" element={<FleetManager initialView="qr-codes" />} />
        <Route path="/perfil" element={<FleetManager initialView="profile" />} />

        {/* Other pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/aguardando-aprovacao" element={<AguardandoAprovacaoPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}
