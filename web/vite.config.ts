import { defineConfig, type Plugin } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

/**
 * Preload the two latin variable fonts so text paints in Inter / JetBrains
 * Mono on first render (no fallback-font layout shift). Hashed asset names are
 * only known after bundling, hence a build-time HTML transform.
 */
function preloadFonts(): Plugin {
  const wanted = [/inter-latin-wght-normal-[\w-]+\.woff2$/, /jetbrains-mono-latin-wght-normal-[\w-]+\.woff2$/];
  let fonts: string[] = [];
  return {
    name: 'hashgram-preload-fonts',
    apply: 'build',
    generateBundle(_opts, bundle) {
      fonts = Object.keys(bundle).filter((f) => wanted.some((re) => re.test(f)));
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const tags = fonts.map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`).join('\n    ');
        return html.replace('</title>', `</title>\n    ${tags}`);
      },
    },
  };
}

// Local development talks to the local indexer exactly like Caddy does in
// production: `/api/*` is stripped of its prefix and forwarded to 127.0.0.1:1318.
const INDEXER = process.env.INDEXER_URL ?? 'http://127.0.0.1:1318';

export default defineConfig({
  plugins: [solid(), tailwindcss(), preloadFonts()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: INDEXER,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: INDEXER,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Never inline assets as data: URIs — the CSP allows only 'self' for fonts/images.
    assetsInlineLimit: 0,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/node_modules\/d3-/.test(id)) return 'd3';
          if (/node_modules\/minisearch/.test(id)) return 'search';
          if (/node_modules\/qrcode/.test(id)) return 'qr';
          return undefined;
        },
      },
    },
  },
});
