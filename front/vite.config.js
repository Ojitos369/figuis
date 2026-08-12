import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // en build, index.html vive en / pero los assets se sirven desde
  // /media/dist/assets/ (ver migrate_view.py) - con esto Vite hornea ese
  // prefijo en TODAS las referencias (script/link/preload de chunks lazy),
  // no solo en el html. En dev (vite serve) se queda en "/" como siempre.
  base: command === 'build' ? '/media/dist/' : '/',
  plugins: [react()],
  server: {
    allowedHosts: ['figuis.ojitos369.com']
  }
}))
