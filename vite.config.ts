// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   optimizeDeps: {
//     exclude: ['lucide-react'],
//   },
// });
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
  plugins: [react()],
  // server: { port:3000 },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ✅ required for @ to work
    },
  },
});
