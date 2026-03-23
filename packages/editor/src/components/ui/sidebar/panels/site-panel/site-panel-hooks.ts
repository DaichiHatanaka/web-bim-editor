import { type AnyNodeId, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react'
import useEditor from './../../../../../store/use-editor'

type TreeSelectionUpdate = {
  selectedIds: string[]
}

type PhaseTransition = {
  from: 'furnish' | 'structure'
  to: 'furnish' | 'structure'
}

export function handleTreeSelection(
  event: MouseEvent,
  nodeId: string,
  selectedIds: string[],
  setSelection: (selection: TreeSelectionUpdate) => void,
) {
  if (event.metaKey || event.ctrlKey) {
    if (selectedIds.includes(nodeId)) {
      setSelection({ selectedIds: selectedIds.filter((id) => id !== nodeId) })
    } else {
      setSelection({ selectedIds: [...selectedIds, nodeId] })
    }
    return true
  }

  if (event.shiftKey && selectedIds.length > 0) {
    const lastSelectedId = selectedIds[selectedIds.length - 1]

    if (lastSelectedId) {
      const treeNodes = Array.from(document.querySelectorAll('[data-treenode-id]'))
      const visibleNodeIds = treeNodes.map((node) => node.getAttribute('data-treenode-id') as string)
      const startIndex = visibleNodeIds.indexOf(lastSelectedId)
      const endIndex = visibleNodeIds.indexOf(nodeId)

      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)
        setSelection({ selectedIds: visibleNodeIds.slice(start, end + 1) })
        return true
      }
    }

    if (!selectedIds.includes(nodeId)) {
      setSelection({ selectedIds: [...selectedIds, nodeId] })
      return true
    }
  }

  setSelection({ selectedIds: [nodeId] })
  return false
}

export function useSceneNodeInteractions(nodeId: AnyNodeId, phaseTransition?: PhaseTransition) {
  const selectedIds = useViewer((state) => state.selection.selectedIds)
  const isSelected = selectedIds.includes(nodeId)
  const isHovered = useViewer((state) => state.hoveredId === nodeId)
  const setSelection = useViewer((state) => state.setSelection)
  const setHoveredId = useViewer((state) => state.setHoveredId)

  const handleClick = (event: MouseEvent) => {
    event.stopPropagation()

    const handled = handleTreeSelection(event, nodeId, selectedIds, setSelection)
    if (!handled && phaseTransition && useEditor.getState().phase === phaseTransition.from) {
      useEditor.getState().setPhase(phaseTransition.to)
    }
  }

  return {
    selectedIds,
    isSelected,
    isHovered,
    handleClick,
    handleMouseEnter: () => setHoveredId(nodeId),
    handleMouseLeave: () => setHoveredId(null),
  }
}

export function useTreeNodeHover(nodeId: AnyNodeId) {
  const isHovered = useViewer((state) => state.hoveredId === nodeId)
  const setHoveredId = useViewer((state) => state.setHoveredId)

  return {
    isHovered,
    handleMouseEnter: () => setHoveredId(nodeId),
    handleMouseLeave: () => setHoveredId(null),
  }
}

export function useTreeNodeRenameState() {
  const [isEditing, setIsEditing] = useState(false)

  return {
    isEditing,
    startEditing: () => setIsEditing(true),
    stopEditing: () => setIsEditing(false),
  }
}

export function useAutoExpandOnDescendantSelection(
  nodeId: AnyNodeId,
  selectedIds: string[],
  setExpanded: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (selectedIds.length === 0) return

    const nodes = useScene.getState().nodes
    const hasSelectedDescendant = selectedIds.some((selectedId) => {
      let current = nodes[selectedId as AnyNodeId]

      while (current?.parentId) {
        if (current.parentId === nodeId) {
          return true
        }

        current = nodes[current.parentId as AnyNodeId]
      }

      return false
    })

    if (hasSelectedDescendant) {
      setExpanded(true)
    }
  }, [nodeId, selectedIds, setExpanded])
}
