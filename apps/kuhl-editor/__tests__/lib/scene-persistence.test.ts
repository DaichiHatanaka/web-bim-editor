import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Drizzle チェーンモックヘルパー
function createChainMock(resolvedValue: unknown = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = [
    'select',
    'insert',
    'update',
    'from',
    'values',
    'set',
    'where',
    'returning',
  ]
  for (const method of methods) {
    chain[method] = vi.fn(() => chain)
  }
  chain.returning = vi.fn(() => Promise.resolve(resolvedValue))
  return chain
}

const mockScene = {
  id: 'scene-1',
  projectId: 'project-1',
  version: 1,
  nodes: { plant_abc: { type: 'plant', id: 'plant_abc' } },
  rootNodeIds: ['plant_abc'],
  collections: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockInsertChain = createChainMock([mockScene])
const mockUpdateChain = createChainMock([mockScene])

vi.mock('../../db', () => {
  return {
    db: {
      query: {
        kuhlScenes: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(() => mockInsertChain),
      update: vi.fn(() => mockUpdateChain),
    },
  }
})

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => 'eq-condition'),
}))

import {
  saveScene,
  loadScene,
  createScene,
} from '../../lib/scene-persistence'

describe('scene-persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveScene', () => {
    it('TC-002-01: useScene.nodesをJSONBとして保存する', async () => {
      const { db } = await import('../../db')
      // 既存シーンなし→新規作成
      vi.mocked(db.query.kuhlScenes.findFirst).mockResolvedValue(undefined)
      mockInsertChain.returning.mockResolvedValue([{ ...mockScene, version: 1 }])

      const result = await saveScene({
        sceneId: 'scene-1',
        projectId: 'project-1',
        nodes: { plant_abc: { type: 'plant', id: 'plant_abc' } },
        rootNodeIds: ['plant_abc'],
        collections: {},
      })

      expect(result).toBeDefined()
      expect(result.version).toBe(1)
    })

    it('TC-002-01b: versionがインクリメントされる', async () => {
      const { db } = await import('../../db')
      vi.mocked(db.query.kuhlScenes.findFirst).mockResolvedValue({
        ...mockScene,
        version: 3,
      })
      mockUpdateChain.returning.mockResolvedValue([{ ...mockScene, version: 4 }])

      const result = await saveScene({
        sceneId: 'scene-1',
        projectId: 'project-1',
        nodes: {},
        rootNodeIds: [],
        collections: {},
      })

      expect(result.version).toBe(4)
    })
  })

  describe('loadScene', () => {
    it('TC-002-02: kuhl_scenesからデータを読み込む', async () => {
      const { db } = await import('../../db')
      vi.mocked(db.query.kuhlScenes.findFirst).mockResolvedValue(mockScene)

      const result = await loadScene('project-1')
      expect(result).toBeDefined()
      expect(result!.nodes).toEqual(mockScene.nodes)
      expect(result!.rootNodeIds).toEqual(mockScene.rootNodeIds)
    })

    it('TC-002-02b: シーンが存在しない場合はnullを返す', async () => {
      const { db } = await import('../../db')
      vi.mocked(db.query.kuhlScenes.findFirst).mockResolvedValue(undefined)

      const result = await loadScene('project-1')
      expect(result).toBeNull()
    })
  })

  describe('createScene', () => {
    it('TC-002-03: 新規シーンを作成する', async () => {
      mockInsertChain.returning.mockResolvedValue([{
        ...mockScene,
        projectId: 'project-1',
        version: 1,
      }])

      const result = await createScene('project-1')
      expect(result).toBeDefined()
      expect(result.projectId).toBe('project-1')
      expect(result.version).toBe(1)
    })
  })
})
