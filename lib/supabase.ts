import { createClient } from '@supabase/supabase-js';

// Função para garantir que temos uma URL HTTP/HTTPS válida
function getValidSupabaseUrl(): string {
  const envUrls = [
    typeof window !== 'undefined' ? (window as any).__SUPABASE_URL : undefined,
    // Access standard Vite env
    (import.meta as any).env?.VITE_SUPABASE_URL,
    typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined,
  ];

  for (const url of envUrls) {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      return url;
    }
  }

  return 'https://placeholder.supabase.co';
}

const supabaseUrl = getValidSupabaseUrl();
const supabaseAnonKey = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined) || 
  'placeholder';

// A configuração de storageKey personalizada ajuda a evitar conflitos de lock que geram o erro "stolen lock"
// Também desativamos o autoRefreshToken se não houver configurações válidas para evitar "Failed to fetch" contínuos
const isConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isConfigured,
    detectSessionInUrl: true,
    storageKey: 'codelmaq-fleet-auth',
  }
});

// Helper para verificar se o Supabase está realmente disponível
export const isSupabaseConfigured = isConfigured;
