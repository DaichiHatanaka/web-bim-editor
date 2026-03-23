import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /api/health', () => {
  it('returns editor health metadata', async () => {
    const response = GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      app: 'editor',
      status: 'ok',
    })
    expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false)
  })
})
