import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Admin is served from the root of admin.thabayehkom.app (base '/').
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
