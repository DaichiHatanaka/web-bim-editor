import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

if (!globalThis.requestAnimationFrame) {
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    value: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

if (!globalThis.cancelAnimationFrame) {
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    value: (handle: number) => clearTimeout(handle),
    writable: true,
    configurable: true,
    enumerable: true,
  })
}
