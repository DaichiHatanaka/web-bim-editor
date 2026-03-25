import { afterEach, describe, expect, it } from 'vitest'
import { AhuNode } from '../../schema/nodes/ahu'
import { BuildingNode } from '../../schema/nodes/building'
import { LevelNode } from '../../schema/nodes/level'
import { PlantNode } from '../../schema/nodes/plant'
import type { AnyNode, AnyNodeId } from '../../schema/types'
import useScene, { clearSceneHistory } from '../../store/use-scene'

const baseEquipmentData = {
  tag: 'TEST-001',
  equipmentName: 'テスト機器',
  position: [0, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  dimensions: [1, 1, 1] as [number, number, number],
  lod: '100' as const,
  status: 'planned' as const,
}

function resetStore() {
  useScene.getState().unloadScene()
  clearSceneHistory()
}

describe('useScene store', () => {
  afterEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('starts with empty nodes and rootNodeIds', () => {
      const state = useScene.getState()
      expect(state.nodes).toEqual({})
      expect(state.rootNodeIds).toEqual([])
      expect(state.dirtyNodes.size).toBe(0)
    })
  })

  describe('createNode', () => {
    it('adds a node to the store', () => {
      const plant = PlantNode.parse({ plantName: 'テスト施設' })
      useScene.getState().createNode(plant)

      const state = useScene.getState()
      expect(state.nodes[plant.id]).toBeDefined()
      expect(state.nodes[plant.id]!.type).toBe('plant')
      expect(state.rootNodeIds).toContain(plant.id)
    })

    it('sets parentId and adds to parent children', () => {
      const level = LevelNode.parse({ floorHeight: 3, ceilingHeight: 2.7, elevation: 0 })
      useScene.getState().createNode(level)

      const ahu = AhuNode.parse({ ...baseEquipmentData })
      useScene.getState().createNode(ahu, level.id as AnyNodeId)

      const state = useScene.getState()
      expect(state.nodes[ahu.id]!.parentId).toBe(level.id)
      const levelNode = state.nodes[level.id] as any
      expect(levelNode.children).toContain(ahu.id)
    })

    it('marks node as dirty after creation', () => {
      const plant = PlantNode.parse({ plantName: 'テスト' })
      useScene.getState().createNode(plant)
      expect(useScene.getState().dirtyNodes.has(plant.id)).toBe(true)
    })
  })

  describe('createNodes (batch)', () => {
    it('adds multiple nodes at once', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      const building = BuildingNode.parse({ buildingName: 'B' })

      useScene.getState().createNodes([
        { node: plant },
        { node: building, parentId: plant.id as AnyNodeId },
      ])

      const state = useScene.getState()
      expect(Object.keys(state.nodes)).toHaveLength(2)
      expect(state.rootNodeIds).toContain(plant.id)
      expect(state.nodes[building.id]!.parentId).toBe(plant.id)
    })
  })

  describe('updateNode', () => {
    it('updates node properties', () => {
      const plant = PlantNode.parse({ plantName: '旧名称' })
      useScene.getState().createNode(plant)

      useScene.getState().updateNode(plant.id as AnyNodeId, { name: '新名称' } as Partial<AnyNode>)

      const updated = useScene.getState().nodes[plant.id]
      expect(updated!.name).toBe('新名称')
    })

    it('marks node as dirty after update', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      useScene.getState().createNode(plant)
      useScene.getState().clearDirty(plant.id as AnyNodeId)

      useScene.getState().updateNode(plant.id as AnyNodeId, { visible: false } as Partial<AnyNode>)
      expect(useScene.getState().dirtyNodes.has(plant.id)).toBe(true)
    })
  })

  describe('deleteNode', () => {
    it('removes node from store', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      useScene.getState().createNode(plant)

      useScene.getState().deleteNode(plant.id as AnyNodeId)

      const state = useScene.getState()
      expect(state.nodes[plant.id]).toBeUndefined()
      expect(state.rootNodeIds).not.toContain(plant.id)
    })

    it('cascade deletes children', () => {
      const level = LevelNode.parse({ floorHeight: 3, ceilingHeight: 2.7, elevation: 0 })
      useScene.getState().createNode(level)

      const ahu1 = AhuNode.parse({ ...baseEquipmentData })
      const ahu2 = AhuNode.parse({ ...baseEquipmentData })
      useScene.getState().createNode(ahu1, level.id as AnyNodeId)
      useScene.getState().createNode(ahu2, level.id as AnyNodeId)

      useScene.getState().deleteNode(level.id as AnyNodeId)

      const state = useScene.getState()
      expect(state.nodes[level.id]).toBeUndefined()
      expect(state.nodes[ahu1.id]).toBeUndefined()
      expect(state.nodes[ahu2.id]).toBeUndefined()
    })

    it('updates parent children list', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      const building = BuildingNode.parse({ buildingName: 'B' })
      useScene.getState().createNode(plant)
      useScene.getState().createNode(building, plant.id as AnyNodeId)

      useScene.getState().deleteNode(building.id as AnyNodeId)

      const plantNode = useScene.getState().nodes[plant.id] as any
      expect(plantNode.children).not.toContain(building.id)
    })
  })

  describe('dirtyNodes', () => {
    it('markDirty adds to set', () => {
      useScene.getState().markDirty('test_id' as AnyNodeId)
      expect(useScene.getState().dirtyNodes.has('test_id' as AnyNodeId)).toBe(true)
    })

    it('clearDirty removes from set', () => {
      useScene.getState().markDirty('test_id' as AnyNodeId)
      useScene.getState().clearDirty('test_id' as AnyNodeId)
      expect(useScene.getState().dirtyNodes.has('test_id' as AnyNodeId)).toBe(false)
    })
  })

  describe('setScene', () => {
    it('replaces nodes and rootNodeIds', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      const nodes = { [plant.id]: plant } as Record<AnyNodeId, AnyNode>
      const rootNodeIds = [plant.id] as AnyNodeId[]

      useScene.getState().setScene(nodes, rootNodeIds)

      const state = useScene.getState()
      expect(Object.keys(state.nodes)).toHaveLength(1)
      expect(state.rootNodeIds).toEqual([plant.id])
      expect(state.dirtyNodes.has(plant.id)).toBe(true)
    })
  })

  describe('unloadScene', () => {
    it('clears all state', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      useScene.getState().createNode(plant)

      useScene.getState().unloadScene()

      const state = useScene.getState()
      expect(state.nodes).toEqual({})
      expect(state.rootNodeIds).toEqual([])
      expect(state.dirtyNodes.size).toBe(0)
    })
  })

  describe('undo/redo (Zundo)', () => {
    it('has temporal store', () => {
      expect(useScene.temporal).toBeDefined()
      expect(useScene.temporal.getState().undo).toBeDefined()
      expect(useScene.temporal.getState().redo).toBeDefined()
    })

    it('undo reverts createNode', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      useScene.getState().createNode(plant)

      expect(useScene.getState().nodes[plant.id]).toBeDefined()

      useScene.temporal.getState().undo()

      expect(useScene.getState().nodes[plant.id]).toBeUndefined()
      expect(useScene.getState().rootNodeIds).not.toContain(plant.id)
    })

    it('redo restores after undo', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      useScene.getState().createNode(plant)

      useScene.temporal.getState().undo()
      expect(useScene.getState().nodes[plant.id]).toBeUndefined()

      useScene.temporal.getState().redo()
      expect(useScene.getState().nodes[plant.id]).toBeDefined()
    })

    it('clearSceneHistory resets temporal state', () => {
      const plant = PlantNode.parse({ plantName: 'P' })
      useScene.getState().createNode(plant)

      clearSceneHistory()

      const temporal = useScene.temporal.getState()
      expect(temporal.pastStates).toHaveLength(0)
      expect(temporal.futureStates).toHaveLength(0)
    })

    it('respects limit of 50 snapshots', () => {
      // Create 55 nodes to exceed limit
      for (let i = 0; i < 55; i++) {
        const plant = PlantNode.parse({ plantName: `P${i}` })
        useScene.getState().createNode(plant)
      }

      const temporal = useScene.temporal.getState()
      expect(temporal.pastStates.length).toBeLessThanOrEqual(50)
    })
  })
})
