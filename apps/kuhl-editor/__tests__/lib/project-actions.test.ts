import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Drizzle チェーンモック — vi.mockのfactoryはhoistされるため、vi.hoisted()を使う
const { mockInsertChain, mockUpdateChain, mockDeleteChain, mockFindMany } =
  vi.hoisted(() => {
    function createChainMock(resolvedValue: unknown = []) {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      const methods = [
        'select',
        'insert',
        'update',
        'delete',
        'from',
        'values',
        'set',
        'where',
        'returning',
        'orderBy',
      ]
      for (const method of methods) {
        chain[method] = vi.fn(() => chain)
      }
      chain.returning = vi.fn(() => Promise.resolve(resolvedValue))
      chain.where = vi.fn(() => ({
        ...chain,
        then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
      }))
      return chain
    }

    return {
      mockInsertChain: createChainMock([]),
      mockUpdateChain: createChainMock([]),
      mockDeleteChain: createChainMock(undefined),
      mockFindMany: vi.fn(),
    }
  })

vi.mock('../../db', () => ({
  db: {
    query: {
      kuhlProjects: {
        findMany: mockFindMany,
      },
    },
    insert: vi.fn(() => mockInsertChain),
    update: vi.fn(() => mockUpdateChain),
    delete: vi.fn(() => mockDeleteChain),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => 'eq-condition'),
}))

import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../../lib/project-actions'

const mockProject = {
  id: 'uuid-1',
  name: '渋谷ビル空調設計',
  description: 'B1F-10F',
  ownerId: 'user-1',
  tenantId: null,
  createdAt: new Date('2026-03-23'),
  updatedAt: new Date('2026-03-23'),
}

describe('project-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listProjects', () => {
    it('TC-001-01: プロジェクト一覧を取得する', async () => {
      mockFindMany.mockResolvedValue([mockProject])

      const result = await listProjects('user-1')
      expect(result).toEqual([mockProject])
      expect(mockFindMany).toHaveBeenCalled()
    })
  })

  describe('createProject', () => {
    it('TC-001-02: プロジェクトを作成し、IDが返される', async () => {
      mockInsertChain.returning.mockResolvedValue([mockProject])

      const result = await createProject({
        name: '渋谷ビル空調設計',
        description: 'テスト',
        ownerId: 'user-1',
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('uuid-1')
      expect(result.name).toBe('渋谷ビル空調設計')
    })
  })

  describe('updateProject', () => {
    it('TC-001-03: プロジェクト名を更新できる', async () => {
      const updated = { ...mockProject, name: '更新後の名前' }
      mockUpdateChain.returning.mockResolvedValue([updated])

      const result = await updateProject('uuid-1', {
        name: '更新後の名前',
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('更新後の名前')
    })
  })

  describe('deleteProject', () => {
    it('TC-001-04: プロジェクトを削除できる', async () => {
      await expect(deleteProject('uuid-1')).resolves.not.toThrow()
    })
  })
})
