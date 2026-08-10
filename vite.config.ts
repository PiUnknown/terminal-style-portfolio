import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
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
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '/'
        if (url === '/' || url === '/index.html') return next()
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

export default defineConfig({
  plugins: [
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
