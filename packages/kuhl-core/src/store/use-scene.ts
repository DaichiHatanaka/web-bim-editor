import type { TemporalState } from 'zundo'
import { temporal } from 'zundo'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { AnyNode, AnyNodeId } from '../schema/types'
import * as nodeActions from './actions/node-actions'

export type SceneState = {
  nodes: Record<AnyNodeId, AnyNode>
  rootNodeIds: AnyNodeId[]
  dirtyNodes: Set<AnyNodeId>

  // Actions
  loadScene: () => void
  clearScene: () => void
  unloadScene: () => void
  setScene: (nodes: Record<AnyNodeId, AnyNode>, rootNodeIds: AnyNodeId[]) => void

  markDirty: (id: AnyNodeId) => void
  clearDirty: (id: AnyNodeId) => void

  createNode: (node: AnyNode, parentId?: AnyNodeId) => void
  createNodes: (ops: { node: AnyNode; parentId?: AnyNodeId }[]) => void

  updateNode: (id: AnyNodeId, data: Partial<AnyNode>) => void
  updateNodes: (updates: { id: AnyNodeId; data: Partial<AnyNode> }[]) => void

  deleteNode: (id: AnyNodeId) => void
  deleteNodes: (ids: AnyNodeId[]) => void
}

type UseSceneStore = UseBoundStore<StoreApi<SceneState>> & {
  temporal: StoreApi<TemporalState<Pick<SceneState, 'nodes' | 'rootNodeIds'>>>
}

const useScene: UseSceneStore = create<SceneState>()(
  temporal(
    (set, get) => ({
      nodes: {},
      rootNodeIds: [],
      dirtyNodes: new Set<AnyNodeId>(),

      unloadScene: () => {
        set({
          nodes: {},
          rootNodeIds: [],
          dirtyNodes: new Set<AnyNodeId>(),
        })
      },

      clearScene: () => {
        get().unloadScene()
        get().loadScene()
      },

      setScene: (nodes, rootNodeIds) => {
        set({
          nodes,
          rootNodeIds,
          dirtyNodes: new Set<AnyNodeId>(),
        })
        for (const node of Object.values(nodes)) {
          get().markDirty(node.id)
        }
      },

      loadScene: () => {
        if (get().rootNodeIds.length > 0) {
          for (const node of Object.values(get().nodes)) {
            get().markDirty(node.id)
          }
          return
        }
        // Empty scene for HVAC - no default hierarchy like Pascal Editor
        // Plant → Building → Level is created by user action
      },

      markDirty: (id) => {
        get().dirtyNodes.add(id)
      },

      clearDirty: (id) => {
        get().dirtyNodes.delete(id)
      },

      createNodes: (ops) => nodeActions.createNodesAction(set, get, ops),
      createNode: (node, parentId) => nodeActions.createNodesAction(set, get, [{ node, parentId }]),

      updateNodes: (updates) => nodeActions.updateNodesAction(set, get, updates),
      updateNode: (id, data) => nodeActions.updateNodesAction(set, get, [{ id, data }]),

      deleteNodes: (ids) => nodeActions.deleteNodesAction(set, get, ids),
      deleteNode: (id) => nodeActions.deleteNodesAction(set, get, [id]),
    }),
    {
      partialize: (state) => {
        const { nodes, rootNodeIds } = state
        return { nodes, rootNodeIds }
      },
      limit: 50,
    },
  ),
)

export default useScene

// Temporal subscription for undo/redo dirty tracking
let prevPastLength = 0
let prevFutureLength = 0
let prevNodesSnapshot: Record<AnyNodeId, AnyNode> | null = null

export function clearSceneHistory() {
  useScene.temporal.getState().clear()
  prevPastLength = 0
  prevFutureLength = 0
  prevNodesSnapshot = null
}

useScene.temporal.subscribe((state) => {
  const currentPastLength = state.pastStates.length
  const currentFutureLength = state.futureStates.length

  const didUndo = currentFutureLength > prevFutureLength
  const didRedo = currentPastLength > prevPastLength && currentFutureLength < prevFutureLength

  if (didUndo || didRedo) {
    const snapshotBefore = prevNodesSnapshot
    const currentNodes = useScene.getState().nodes
    const { markDirty } = useScene.getState()

    if (snapshotBefore) {
      for (const [id, node] of Object.entries(currentNodes) as [AnyNodeId, AnyNode][]) {
        if (snapshotBefore[id] !== node) {
          markDirty(id)
          if (node.parentId) markDirty(node.parentId as AnyNodeId)
        }
      }
      for (const [id, node] of Object.entries(snapshotBefore) as [AnyNodeId, AnyNode][]) {
        if (!currentNodes[id]) {
          if (node.parentId) markDirty(node.parentId as AnyNodeId)
        }
      }
    } else {
      for (const node of Object.values(currentNodes)) {
        markDirty(node.id)
      }
    }
  }

  prevPastLength = currentPastLength
  prevFutureLength = currentFutureLength
  prevNodesSnapshot = useScene.getState().nodes
})
