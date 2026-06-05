'use client';

import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore'; 
import { 
  ClipboardList, 
  LayoutDashboard, 
  Truck, 
  FileText, 
  ShieldCheck,
  Loader2
} from 'lucide-react';

export function MenuNavegacao() {
  const { usuario } = useAuthStore(); // Pega o usuário logado

  // Se a tela carregar antes do usuário, mostra um loading ou retorna null
  if (!usuario) {
    return (
      <div className="flex items-center gap-2 p-4 text-gray-500 dark:text-gray-400">
        <Loader2 className="animate-spin" size={20} />
        <span>Carregando menu...</span>
      </div>
    );
  }

  return (
    <nav className="flex flex-col space-y-2 p-4">
      {/* 🟢 VISÍVEL PARA TODOS (Colaborador e Administrador) */}
      <Link to="/parte-diaria" className="flex items-center gap-2 p-3 bg-blue-100 text-blue-900 rounded-xl font-medium hover:bg-blue-200 transition-colors">
        <ClipboardList size={20} /> Parte Diária (Abrir/Fechar)
      </Link>

      {/* 🔴 VISÍVEL APENAS PARA ADMINISTRADOR */}
      {usuario.role === 'administrador' && (
        <div className="pt-4 space-y-2">
          <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Administração</p>
          
          <Link to="/dashboard" className="flex items-center gap-2 p-3 hover:bg-gray-100 dark:bg-[#1e1e1e] rounded-xl transition-colors text-gray-700 dark:text-gray-200">
            <LayoutDashboard size={20} /> Painel Geral
          </Link>
          
          <Link to="/frota" className="flex items-center gap-2 p-3 hover:bg-gray-100 dark:bg-[#1e1e1e] rounded-xl transition-colors text-gray-700 dark:text-gray-200">
            <Truck size={20} /> Gestão de Frota e Máquinas
          </Link>

          <Link to="/relatorios" className="flex items-center gap-2 p-3 hover:bg-gray-100 dark:bg-[#1e1e1e] rounded-xl transition-colors text-gray-700 dark:text-gray-200">
            <FileText size={20} /> Relatórios PDF
          </Link>
          
          <Link to="/configuracoes" className="flex items-center gap-2 p-3 hover:bg-gray-100 dark:bg-[#1e1e1e] rounded-xl transition-colors text-gray-700 dark:text-gray-200">
            <ShieldCheck size={20} /> Painel Administrativo
          </Link>
        </div>
      )}
    </nav>
  );
}
