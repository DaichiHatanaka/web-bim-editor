import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: path.resolve(__dirname, '.vitest-cache'),
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: [path.resolve(__dirname, '../../vitest.dom.setup.ts')],
  },
})
