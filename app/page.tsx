"use client";
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const { usuario, setUsuario } = useAuthStore();

  useEffect(() => {
    if (usuario) {
      window.location.replace('/dashboard');
    } else {
      window.location.replace('/login');
    }
  }, [usuario]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#101010]">
      <div className="flex flex-col items-center space-y-6 p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">Codelmaq Frota</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Redirecionando para o sistema...</p>
        </div>
        <button 
          onClick={() => window.location.replace('/dashboard')}
          className="text-blue-600 text-sm underline mt-4"
        >
          Clique aqui se não for redirecionado em instantes
        </button>
      </div>
    </div>
  );
}
