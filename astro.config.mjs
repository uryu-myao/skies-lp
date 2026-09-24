// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://useskies.com',
  // `privacy.html` rather than `privacy/index.html`, so pages live at
  // clean URLs (/privacy) — Workers static assets resolve the extension.
  build: { format: 'file' },
  trailingSlash: 'never',
  integrations: [sitemap()],
});
