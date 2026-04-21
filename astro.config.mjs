import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // あなたのリポジトリ名に合わせて設定
  site: 'https://tadasix95-source.github.io',
  base: '/cat-wanted-sim',
  integrations: [react(), tailwind()],
  output: 'static', // これを追加
});