"use client";

import { useEffect } from 'react';
import { useRouter } from '@/hooks/useRouter';

export default function AguardandoAprovacao() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-900">
      <div className="bg-yellow-100 p-8 rounded-3xl shadow-xl max-w-md border border-yellow-200">
        <h1 className="text-2xl font-bold text-yellow-800 mb-4">Cadastro em Análise ⏳</h1>
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
          Sua conta foi criada com sucesso, mas precisa ser liberada por um administrador para acessar a Parte Diária e os equipamentos.
        </p>
        <div className="mt-6 pt-6 border-t border-yellow-200">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Aguarde a liberação ou entre em contato com a supervisão.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold rounded-xl transition-all shadow-sm"
        >
          Verificar Status
        </button>
      </div>
    </div>
  );
}
