import type { AnyNode, AnyNodeId } from '../../schema/types'
import type { SceneState } from '../use-scene'

type AnyContainerNode = AnyNode & { children: string[] }

export const createNodesAction = (
  set: (fn: (state: SceneState) => Partial<SceneState>) => void,
  get: () => SceneState,
  ops: { node: AnyNode; parentId?: AnyNodeId }[],
) => {
  set((state) => {
    const nextNodes = { ...state.nodes }
    const nextRootIds = [...state.rootNodeIds]

    for (const { node, parentId } of ops) {
      const newNode: AnyNode =
        parentId !== undefined
          ? { ...node, parentId }
          : (() => {
              const { parentId: _omit, ...rest } = node as AnyNode & { parentId?: unknown }
              return rest as AnyNode
            })()

      nextNodes[newNode.id] = newNode

      if (parentId && nextNodes[parentId]) {
        const parent = nextNodes[parentId]
        if ('children' in parent && Array.isArray(parent.children)) {
          nextNodes[parentId] = {
            ...parent,
            children: Array.from(new Set([...parent.children, newNode.id])) as any,
          }
        }
      } else if (!parentId) {
        if (!nextRootIds.includes(newNode.id)) {
          nextRootIds.push(newNode.id)
        }
      }
    }

    return { nodes: nextNodes, rootNodeIds: nextRootIds }
  })

  for (const { node, parentId } of ops) {
    get().markDirty(node.id)
    if (parentId) get().markDirty(parentId)
  }
}

export const updateNodesAction = (
  set: (fn: (state: SceneState) => Partial<SceneState>) => void,
  get: () => SceneState,
  updates: { id: AnyNodeId; data: Partial<AnyNode> }[],
) => {
  const parentsToUpdate = new Set<AnyNodeId>()

  set((state) => {
    const nextNodes = { ...state.nodes }

    for (const { id, data } of updates) {
      const currentNode = nextNodes[id]
      if (!currentNode) continue

      // Handle Reparenting
      if (data.parentId !== undefined && data.parentId !== currentNode.parentId) {
        const oldParentId = currentNode.parentId as AnyNodeId | null
        if (oldParentId && nextNodes[oldParentId]) {
          const oldParent = nextNodes[oldParentId] as AnyContainerNode
          nextNodes[oldParent.id] = {
            ...oldParent,
            children: oldParent.children.filter((childId) => childId !== id),
          } as AnyNode
          parentsToUpdate.add(oldParent.id)
        }

        const newParentId = data.parentId as AnyNodeId | null
        if (newParentId && nextNodes[newParentId]) {
          const newParent = nextNodes[newParentId] as AnyContainerNode
          nextNodes[newParent.id] = {
            ...newParent,
            children: Array.from(new Set([...newParent.children, id])),
          } as AnyNode
          parentsToUpdate.add(newParent.id)
        }
      }

      nextNodes[id] = { ...nextNodes[id], ...data } as AnyNode
    }

    return { nodes: nextNodes }
  })

  for (const u of updates) {
    get().markDirty(u.id)
  }
  for (const pId of parentsToUpdate) {
    get().markDirty(pId)
  }
}

export const deleteNodesAction = (
  set: (fn: (state: SceneState) => Partial<SceneState>) => void,
  get: () => SceneState,
  ids: AnyNodeId[],
) => {
  const parentsToMarkDirty = new Set<AnyNodeId>()

  set((state) => {
    const nextNodes = { ...state.nodes }
    let nextRootIds = [...state.rootNodeIds]

    for (const id of ids) {
      const node = nextNodes[id]
      if (!node) continue

      // Remove from parent
      const parentId = node.parentId as AnyNodeId | null
      if (parentId && nextNodes[parentId]) {
        const parent = nextNodes[parentId] as AnyContainerNode
        if (parent.children) {
          nextNodes[parent.id] = {
            ...parent,
            children: parent.children.filter((cid) => cid !== id),
          } as AnyNode
          parentsToMarkDirty.add(parent.id)
        }
      }

      // Remove from root list
      nextRootIds = nextRootIds.filter((rid) => rid !== id)

      // Delete node
      delete nextNodes[id]

      // Cascade delete children
      if ('children' in node && Array.isArray(node.children) && node.children.length > 0) {
        const deleteChildren = (childIds: string[]) => {
          for (const childId of childIds) {
            const child = nextNodes[childId as AnyNodeId]
            if (!child) continue
            if ('children' in child && Array.isArray(child.children)) {
              deleteChildren(child.children)
            }
            delete nextNodes[childId as AnyNodeId]
            nextRootIds = nextRootIds.filter((rid) => rid !== childId)
          }
        }
        deleteChildren(node.children)
      }
    }

    return { nodes: nextNodes, rootNodeIds: nextRootIds }
  })

  for (const parentId of parentsToMarkDirty) {
    get().markDirty(parentId)
    const parent = get().nodes[parentId]
    if (parent && 'children' in parent && Array.isArray(parent.children)) {
      for (const childId of parent.children) {
        get().markDirty(childId as AnyNodeId)
      }
    }
  }
}
