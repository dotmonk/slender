import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base URL matches the GitHub Pages repo path: https://dotmonk.github.io/slender/
export default defineConfig({
  plugins: [react()],
  base: '/slender/',
});
