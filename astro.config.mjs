import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://adwd.github.io',
  base: '/pi-docs-ja',
  output: 'static',
  trailingSlash: 'always',
  server: { host: '127.0.0.1' },
});
