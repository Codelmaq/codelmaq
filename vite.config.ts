import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  define: {
    'process.env': {
      NEXT_PUBLIC_SUPABASE_URL: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''),
      VITE_SUPABASE_URL: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
      VITE_SUPABASE_ANON_KEY: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''),
    }
  },
  server: {
    port: 3000,
    host: true,
  },
});
