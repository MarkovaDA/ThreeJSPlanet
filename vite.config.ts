import { defineConfig } from 'vite'

const siteBase = process.env.SITE_BASE ?? '/ThreeJSPlanet/'

export default defineConfig({
  base: siteBase.endsWith('/') ? siteBase : `${siteBase}/`,
})
