import { defineConfig } from 'astro/config';
export default defineConfig({ output: 'static', outDir: './build', trailingSlash: 'never', build: { format: 'file' }, devToolbar: { enabled: false } });
