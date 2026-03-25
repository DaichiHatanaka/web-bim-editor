import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 【環境設定】: デフォルトはnode環境。コンポーネントテスト（.tsx）はjsdom環境を使用
    // 🟡 黄信号: @testing-library/react が document を必要とするため、tsx テストには jsdom が必要
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: [path.resolve(__dirname, '../../vitest.node.setup.ts')],
    environmentMatchGlobs: [
      // 【jsdom適用対象】: Reactコンポーネントのレンダリングテスト（.tsx）にjsdomを使用
      ['src/**/*.test.tsx', 'jsdom'],
    ],
  },
})
