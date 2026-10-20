import { defineConfig, ViteDevServer, Connect } from 'vite'
import path from 'path'
import fs from 'fs'
import { ServerResponse } from 'http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function dev404Fallback() {
  return {
    name: 'dev-404-fallback',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        const url = req.url?.split('?')[0] ?? '/'
        if (url === '/' || url === '/index.html') return next()
        // Only fallback to 404.html if the request accepts HTML
        if (!req.headers.accept?.includes('text/html')) return next()
        const filePath = path.resolve(__dirname, 'dist', url.slice(1))
        if (fs.existsSync(filePath)) return next()
        const notFound = path.resolve(__dirname, 'public', '404.html')
        if (fs.existsSync(notFound)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html')
          res.end(fs.readFileSync(notFound, 'utf-8'))
          return
        }
        next()
      })
    },
  }
}

function devApiMiddleware() {
  return {
    name: 'dev-api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.url && req.url.startsWith('/api/views')) {
          try {
            const apiModule = await server.ssrLoadModule('/api/views.js');
            const handler = apiModule.default;
            const fullUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const query: Record<string, string> = {};
            fullUrl.searchParams.forEach((v, k) => {
              query[k] = v;
            });

            let bodyStr = '';
            if (req.method === 'POST') {
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              await new Promise<void>((resolve) => req.on('end', () => resolve()));
            }

            const enhancedReq = Object.assign(req, {
              query,
              body: bodyStr,
            });

            const enhancedRes = Object.assign(res, {
              status(code: number) {
                res.statusCode = code;
                return {
                  json(data: unknown) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end() {
                    res.end();
                  },
                };
              },
            });

            await handler(enhancedReq, enhancedRes);
            return;
          } catch (err) {
            console.error('[dev-api] Error handling /api/views:', err);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    devApiMiddleware(),
    figmaAssetResolver(),
    dev404Fallback(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
