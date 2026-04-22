import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // あなたのリポジトリ名に合わせて設定
  site: 'https://tadasix95-source.github.io',
  base: '/cat-wanted-sim',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'static',
});