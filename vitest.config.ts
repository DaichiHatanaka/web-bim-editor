import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/core/vitest.config.ts',
      'packages/kuhl-core/vitest.config.ts',
      'packages/kuhl-viewer/vitest.config.ts',
      'apps/editor/vitest.config.ts',
      'apps/kuhl-editor/vitest.config.ts',
    ],
  },
})
