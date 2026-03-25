import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import {
  cacheScene,
  loadCachedScene,
  updateCache,
  clearCache,
} from '../../lib/indexeddb-cache'

describe('indexeddb-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('cacheScene', () => {
    it('TC-004-01: シーンデータをIndexedDBに保存する', async () => {
      const sceneData = {
        nodes: { plant_abc: { type: 'plant', id: 'plant_abc' } },
        rootNodeIds: ['plant_abc'],
        collections: {},
        version: 1,
      }

      await expect(
        cacheScene('project-1', sceneData)
      ).resolves.not.toThrow()
    })
  })

  describe('loadCachedScene', () => {
    it('TC-004-02: IndexedDBからシーンデータを読み込む', async () => {
      const sceneData = {
        nodes: { plant_abc: { type: 'plant', id: 'plant_abc' } },
        rootNodeIds: ['plant_abc'],
        collections: {},
        version: 1,
      }
      await cacheScene('project-1', sceneData)

      const result = await loadCachedScene('project-1')
      expect(result).toBeDefined()
      expect(result?.nodes).toEqual(sceneData.nodes)
    })

    it('TC-004-02b: データがない場合はnullを返す', async () => {
      const result = await loadCachedScene('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('updateCache', () => {
    it('TC-004-03: Supabase同期後にキャッシュを更新する', async () => {
      const sceneData = {
        nodes: { plant_abc: { type: 'plant', id: 'plant_abc' } },
        rootNodeIds: ['plant_abc'],
        collections: {},
        version: 2,
      }

      await expect(
        updateCache('project-1', sceneData)
      ).resolves.not.toThrow()
    })
  })

  describe('clearCache', () => {
    it('TC-004-04: キャッシュをクリアする', async () => {
      await cacheScene('project-1', {
        nodes: {},
        rootNodeIds: [],
        collections: {},
        version: 1,
      })

      await expect(clearCache('project-1')).resolves.not.toThrow()

      const result = await loadCachedScene('project-1')
      expect(result).toBeNull()
    })
  })
})
