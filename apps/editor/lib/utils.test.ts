import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('BASE_URL', () => {
  it('uses NEXT_PUBLIC_APP_URL during development', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3002')
    vi.stubEnv('NODE_ENV', 'development')

    const { BASE_URL } = await import('./utils')

    expect(BASE_URL).toBe('http://localhost:3002')
  })

  it('uses the preview deployment URL when running in preview', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_URL', 'preview-editor.example.vercel.app')

    const { BASE_URL } = await import('./utils')

    expect(BASE_URL).toBe('https://preview-editor.example.vercel.app')
  })

  it('falls back to the production deployment URL when no custom domain is set', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL', 'editor.example.com')

    const { BASE_URL } = await import('./utils')

    expect(BASE_URL).toBe('https://editor.example.com')
  })
})
