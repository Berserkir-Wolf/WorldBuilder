import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  root: 'client',
  plugins: [vue(), vuetify({ autoImport: true })],
  base: './',
  build: {
    outDir: 'public',
    emptyOutDir: true
  }
});
