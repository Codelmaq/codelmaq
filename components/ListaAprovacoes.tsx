"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, UserPlus, ShieldCheck } from 'lucide-react';

export function ListaAprovacoes({ onStatusUpdate }: { onStatusUpdate?: (id: string, status: string) => void }) {
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca quem está pendente
  const buscarPendentes = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('status', 'pendente');
    
    if (error) {
      console.error('Erro ao buscar pendentes:', error);
    } else if (data) {
      setPendentes(data);
    }
    setLoading(false);
  };

  // Função para aprovar
  const aprovarColaborador = async (id: string) => {
    if (onStatusUpdate) {
      await onStatusUpdate(id, 'aprovado');
      buscarPendentes(false);
      return;
    }

    const { error } = await supabase
      .from('funcionarios')
      .update({ status: 'aprovado' })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao aprovar colaborador:', error);
    } else {
      buscarPendentes(false); // Atualiza a lista sem mostrar o loading principal
    }
  };

  // Função para bloquear/rejeitar
  const bloquearColaborador = async (id: string) => {
    if (onStatusUpdate) {
      await onStatusUpdate(id, 'bloqueado');
      buscarPendentes(false);
      return;
    }

    const { error } = await supabase
      .from('funcionarios')
      .update({ status: 'bloqueado' })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao bloquear colaborador:', error);
    } else {
      buscarPendentes(false); // Atualiza a lista sem mostrar o loading principal
    }
  };

  useEffect(() => {
    const init = async () => {
      await buscarPendentes(false); // Já começa como true no state
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (pendentes.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-[#101010] rounded-xl border border-dashed border-gray-300">
        <ShieldCheck size={48} className="mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500 dark:text-gray-400">Nenhum cadastro aguardando aprovação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <UserPlus size={20} className="mr-2 text-yellow-600" /> 
          Cadastros Pendentes
        </h2>
        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {pendentes.length} aguardando
        </span>
      </div>
      
      <div className="grid gap-3">
        {pendentes.map((user: any) => (
          <div key={user.id} className="flex justify-between items-center p-4 border border-gray-200 dark:border-white/10 rounded-xl shadow-sm bg-white dark:bg-[#151515] hover:border-yellow-300 transition-colors">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold mr-3">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-100">{user.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{user.role || 'Colaborador'}</p>
                <p className="text-[10px] text-gray-400">Solicitou acesso em {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Data não informada'}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => aprovarColaborador(user.id)}
                className="flex items-center bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <CheckCircle size={16} className="mr-1.5" />
                Aprovar
              </button>
              <button 
                onClick={() => bloquearColaborador(user.id)}
                className="flex items-center bg-white dark:bg-[#151515] text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
              >
                <XCircle size={16} className="mr-1.5" />
                Recusar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
