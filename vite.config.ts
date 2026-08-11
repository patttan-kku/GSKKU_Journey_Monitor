import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const rawBasePath = process.env.BASE_PATH || process.env.VITE_BASE_PATH || env.BASE_PATH || env.VITE_BASE_PATH || '/';
  const formattedBasePath = rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`;

  return {
    base: formattedBasePath,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.BASE_PATH': JSON.stringify(formattedBasePath),
      'process.env.VITE_BASE_PATH': JSON.stringify(formattedBasePath),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
  };
});
