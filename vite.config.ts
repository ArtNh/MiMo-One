import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    // 仅在生产或构建时使用 electron 插件，开发时使用普通 Vite
    ...(process.env.NODE_ENV === 'development' ? [] : [electron({
      entry: 'electron/main.js',
      vite: {}
    })])
  ]
});
