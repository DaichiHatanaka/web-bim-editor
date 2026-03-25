import { describe, expect, it, vi } from 'vitest'
import { BuildingNode } from '../../schema/nodes/building'
import { LevelNode } from '../../schema/nodes/level'
import type { AnyNode, AnyNodeId } from '../../schema/types'
import { createNodesAction, deleteNodesAction, updateNodesAction } from './node-actions'
import type { SceneState } from '../use-scene'

type TestSceneState = SceneState & {
  deleteNodes: (ids: AnyNodeId[]) => void
}

function createTestState(overrides?: Partial<Pick<SceneState, 'nodes' | 'rootNodeIds' | 'collections'>>) {
  const dirtyNodes = new Set<AnyNodeId>()
  const state = {
    nodes: overrides?.nodes ?? {},
    rootNodeIds: overrides?.rootNodeIds ?? [],
    dirtyNodes,
    collections: overrides?.collections ?? {},
    loadScene: vi.fn(),
    clearScene: vi.fn(),
    unloadScene: vi.fn(),
    setScene: vi.fn(),
    markDirty: (id: AnyNodeId) => {
      dirtyNodes.add(id)
    },
    clearDirty: (id: AnyNodeId) => {
      dirtyNodes.delete(id)
    },
    createNode: vi.fn(),
    createNodes: vi.fn(),
    updateNode: vi.fn(),
    updateNodes: vi.fn(),
    deleteNode: vi.fn(),
    deleteNodes: vi.fn(),
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    updateCollection: vi.fn(),
    addToCollection: vi.fn(),
    removeFromCollection: vi.fn(),
  } satisfies TestSceneState

  const set = (updater: (current: SceneState) => Partial<SceneState>) => {
    Object.assign(state, updater(state))
  }
  const get = () => state

  state.deleteNodes = (ids: AnyNodeId[]) => deleteNodesAction(set, get, ids)

  return { state, set, get }
}

describe('node actions', () => {
  it('creates child nodes and marks the child and parent dirty', () => {
    const building = BuildingNode.parse({ children: [] })
    const { state, set, get } = createTestState({
      nodes: {
        [building.id]: building,
      },
      rootNodeIds: [building.id],
    })
    const level = LevelNode.parse({ children: [], level: 1 })

    createNodesAction(set, get, [{ node: level, parentId: building.id }])

    expect(state.nodes[level.id]).toMatchObject({
      id: level.id,
      parentId: building.id,
    })
    expect((state.nodes[building.id] as typeof building).children).toContain(level.id)
    expect(state.dirtyNodes.has(level.id)).toBe(true)
    expect(state.dirtyNodes.has(building.id)).toBe(true)
  })

  it('reparents nodes and marks both parents dirty on the next animation frame', () => {
    const firstBuilding = BuildingNode.parse({ children: [] })
    const secondBuilding = BuildingNode.parse({ children: [] })
    const level = LevelNode.parse({
      children: [],
      level: 0,
      parentId: firstBuilding.id,
    }) as AnyNode
    const { state, set, get } = createTestState({
      nodes: {
        [firstBuilding.id]: {
          ...firstBuilding,
          children: [level.id],
        },
        [secondBuilding.id]: secondBuilding,
        [level.id]: level,
      },
      rootNodeIds: [firstBuilding.id, secondBuilding.id],
    })

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })

    updateNodesAction(set, get, [{ id: level.id, data: { parentId: secondBuilding.id } }])

    expect((state.nodes[firstBuilding.id] as typeof firstBuilding).children).not.toContain(level.id)
    expect((state.nodes[secondBuilding.id] as typeof secondBuilding).children).toContain(level.id)
    expect(state.nodes[level.id]?.parentId).toBe(secondBuilding.id)
    expect(state.dirtyNodes.has(level.id)).toBe(true)
    expect(state.dirtyNodes.has(firstBuilding.id)).toBe(true)
    expect(state.dirtyNodes.has(secondBuilding.id)).toBe(true)

    vi.unstubAllGlobals()
  })

  it('deletes nodes, removes parent references, and updates collections', () => {
    const building = BuildingNode.parse({ children: [] })
    const level = LevelNode.parse({
      children: [],
      level: 0,
      parentId: building.id,
    }) as AnyNode & { collectionIds?: string[] }
    const levelWithCollection = {
      ...level,
      collectionIds: ['collection_1'],
    }
    const { state, set, get } = createTestState({
      nodes: {
        [building.id]: {
          ...building,
          children: [level.id],
        },
        [level.id]: levelWithCollection,
      },
      rootNodeIds: [building.id],
      collections: {
        collection_1: {
          id: 'collection_1',
          name: 'Primary',
          nodeIds: [level.id],
        },
      },
    })

    deleteNodesAction(set, get, [level.id])

    expect(state.nodes[level.id]).toBeUndefined()
    expect((state.nodes[building.id] as typeof building).children).not.toContain(level.id)
    expect(state.collections.collection_1?.nodeIds).toEqual([])
    expect(state.dirtyNodes.has(building.id)).toBe(true)
  })
})
