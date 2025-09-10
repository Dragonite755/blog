import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateSitemap } from './generateSiteMap.js'

import express from 'express'
import dotenv from 'dotenv'
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function createProdServer() {
  const app = express()

  app.use((await import('compression')).default())
  app.use(
    (await import('serve-static')).default(
      path.resolve(__dirname, 'dist/client'),
      {
        index: false,
      },
    ),
  )

  // Sitemap
  app.get('/sitemap.xml', async (req, res) => {
    const sitemap = await generateSitemap()
    return res
      .status(200)
      .set({ 'Content-Type': 'application/xml' })
      .end(sitemap)
  })

  // SSR
  app.use('*', async (req, res, next) => {
    try {
      let template = fs.readFileSync(
        path.resolve(__dirname, 'dist/client/index.html'),
        'utf-8',
      )
      const render = (await import('./dist/server/entry-server.js')).render
      const appHtml = await render(req)
      const html = template.replace(`<!--ssr-outlet-->`, appHtml)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (err) {
      next(err)
    }
  })

  return app
}

async function createDevServer() {
  const app = express()
  const vite = await (
    await import('vite')
  ).createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })
  app.use(vite.middlewares)

  // Sitemap
  app.get('/sitemap.xml', async (req, res) => {
    const sitemap = await generateSitemap()
    return res
      .status(200)
      .set({ 'Content-Type': 'application/xml' })
      .end(sitemap)
  })

  // SSR
  app.use('*', async (req, res, next) => {
    try {
      const templateHtml = fs.readFileSync(
        path.resolve(__dirname, 'index.html'),
        'utf-8',
      )
      const template = await vite.transformIndexHtml(
        req.originalUrl,
        templateHtml,
      )
      const { render } = await vite.ssrLoadModule('/src/entry-server.jsx')
      const appHtml = await render(req)
      const html = template.replace('<!--ssr-outlet-->', appHtml)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (err) {
      vite.ssrFixStacktrace(err)
      next(err)
    }
  })

  return app
}

// Start production server
if (process.env.NODE_ENV === 'production') {
  const app = await createProdServer()
  app.listen(process.env.PORT, () =>
    console.log(
      `ssr production server running on http://localhost:${process.env.PORT}`,
    ),
  )

  // Start dev server
} else {
  const app = await createDevServer()
  app.listen(process.env.PORT, () =>
    console.log(
      `ssr dev server running on http://localhost:${process.env.PORT}`,
    ),
  )
}
