// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// Static output: the dataset only changes when a PR merges, so there is nothing
// to render per-request. This deploys free to Cloudflare Pages / GitHub Pages
// and keeps every cert page individually crawlable for long-tail SEO.
export default defineConfig({
  site: 'https://certs.pyaeheinnkyaw.com',
  output: 'static',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
})
