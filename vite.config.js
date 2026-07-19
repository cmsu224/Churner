import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Web (GitHub Pages) is served from /Churner/; the native Capacitor bundle is
// served from the app origin (capacitor://localhost), so it needs a relative
// base. `npm run build:mobile` sets CAPACITOR=1.
export default defineConfig({
  plugins: [react()],
  base: process.env.CAPACITOR ? './' : '/Churner/',
})
