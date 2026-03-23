import type { LevelNode } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { Layers } from 'lucide-react'
import { useState } from 'react'
import { InlineRenameInput } from './inline-rename-input'
import { useTreeNodeRenameState } from './site-panel-hooks'
import { TreeNode, TreeNodeWrapper } from './tree-node'
import { TreeNodeActions } from './tree-node-actions'

interface LevelTreeNodeProps {
  node: LevelNode
  depth: number
  isLast?: boolean
}

export function LevelTreeNode({ node, depth, isLast }: LevelTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const { isEditing, startEditing, stopEditing } = useTreeNodeRenameState()
  const isSelected = useViewer((state) => state.selection.levelId === node.id)
  const isHovered = useViewer((state) => state.hoveredId === node.id)
  const setSelection = useViewer((state) => state.setSelection)

  const handleClick = () => {
    setSelection({ levelId: node.id })
  }

  const defaultName = `Level ${node.level}`

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={expanded}
      hasChildren={node.children.length > 0}
      icon={<Layers className="h-3.5 w-3.5" />}
      isHovered={isHovered}
      isLast={isLast}
      isSelected={isSelected}
      label={
        <InlineRenameInput
          defaultName={defaultName}
          isEditing={isEditing}
          node={node}
          onStartEditing={startEditing}
          onStopEditing={stopEditing}
        />
      }
      onClick={handleClick}
      onDoubleClick={startEditing}
      onToggle={() => setExpanded((current) => !current)}
    >
      {node.children.map((childId, index) => (
        <TreeNode
          depth={depth + 1}
          isLast={index === node.children.length - 1}
          key={childId}
          nodeId={childId}
        />
      ))}
    </TreeNodeWrapper>
  )
}
