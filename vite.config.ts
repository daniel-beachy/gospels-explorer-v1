import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages under /gospels-explorer-v1/.
export default defineConfig({
  base: './',
  plugins: [react()],
})
