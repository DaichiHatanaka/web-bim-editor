import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSaveScene = vi.fn().mockResolvedValue({ version: 1 })
const mockUpdateCache = vi.fn().mockResolvedValue(undefined)

vi.mock('../../lib/scene-persistence', () => ({
  saveScene: (...args: unknown[]) => mockSaveScene(...args),
}))

vi.mock('../../lib/indexeddb-cache', () => ({
  updateCache: (...args: unknown[]) => mockUpdateCache(...args),
}))

import { createAutoSave } from '../../lib/auto-save'

describe('auto-save', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSaveScene.mockClear()
    mockUpdateCache.mockClear()
    mockSaveScene.mockResolvedValue({ version: 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('debounce動作', () => {
    it('TC-003-01: 変更後5秒後に自動保存される', async () => {
      const autoSave = createAutoSave({
        sceneId: 'scene-1',
        projectId: 'project-1',
      })

      autoSave.trigger({
        nodes: { plant_abc: { type: 'plant', id: 'plant_abc' } },
        rootNodeIds: ['plant_abc'],
        collections: {},
      })

      // 4秒後はまだ保存されない
      await vi.advanceTimersByTimeAsync(4000)
      expect(mockSaveScene).not.toHaveBeenCalled()

      // 5秒後に保存
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockSaveScene).toHaveBeenCalledTimes(1)
    })

    it('TC-003-01b: 5秒以内の連続変更はまとめて1回', async () => {
      const autoSave = createAutoSave({
        sceneId: 'scene-1',
        projectId: 'project-1',
      })

      const data = { nodes: {}, rootNodeIds: [] as string[], collections: {} }

      autoSave.trigger(data)
      await vi.advanceTimersByTimeAsync(2000)
      autoSave.trigger(data)
      await vi.advanceTimersByTimeAsync(2000)
      autoSave.trigger(data)
      await vi.advanceTimersByTimeAsync(5000)

      expect(mockSaveScene).toHaveBeenCalledTimes(1)
    })
  })

  describe('二重保存防止', () => {
    it('TC-003-02: 保存中は同じデータで二重保存しない', async () => {
      let resolveSave: () => void
      mockSaveScene.mockImplementationOnce(
        () =>
          new Promise<{ version: number }>((resolve) => {
            resolveSave = () => resolve({ version: 1 })
          })
      )

      const autoSave = createAutoSave({
        sceneId: 'scene-1',
        projectId: 'project-1',
      })

      const data = { nodes: {}, rootNodeIds: [] as string[], collections: {} }

      // 最初のトリガー
      autoSave.trigger(data)
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockSaveScene).toHaveBeenCalledTimes(1)

      // 保存中に再トリガー
      autoSave.trigger(data)
      await vi.advanceTimersByTimeAsync(5000)

      // まだ最初の保存が完了していないので1回のまま
      expect(mockSaveScene).toHaveBeenCalledTimes(1)

      // 最初の保存完了
      resolveSave!()
      await vi.advanceTimersByTimeAsync(0)
    })
  })
})
