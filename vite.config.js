import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Served from https://envenum.github.io/MyNFlix/ so assets live under /MyNFlix/
export default defineConfig({
  plugins: [react()],
  base: '/MyNFlix/',
})
