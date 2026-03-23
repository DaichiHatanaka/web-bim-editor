import type { CeilingNode } from '@pascal-app/core'
import Image from 'next/image'
import { useState } from 'react'
import { InlineRenameInput } from './inline-rename-input'
import {
  useAutoExpandOnDescendantSelection,
  useSceneNodeInteractions,
  useTreeNodeRenameState,
} from './site-panel-hooks'
import { formatPolygonAreaName } from './site-panel-math'
import { TreeNode, TreeNodeWrapper } from './tree-node'
import { TreeNodeActions } from './tree-node-actions'

interface CeilingTreeNodeProps {
  node: CeilingNode
  depth: number
  isLast?: boolean
}

export function CeilingTreeNode({ node, depth, isLast }: CeilingTreeNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const { isEditing, startEditing, stopEditing } = useTreeNodeRenameState()
  const {
    selectedIds,
    isSelected,
    isHovered,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
  } = useSceneNodeInteractions(node.id, { from: 'furnish', to: 'structure' })
  useAutoExpandOnDescendantSelection(node.id, selectedIds, setExpanded)

  const defaultName = formatPolygonAreaName('Ceiling', node.polygon)

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={expanded}
      hasChildren={node.children.length > 0}
      icon={
        <Image alt="" className="object-contain" height={14} src="/icons/ceiling.png" width={14} />
      }
      isHovered={isHovered}
      isLast={isLast}
      isSelected={isSelected}
      isVisible={node.visible !== false}
      label={
        <InlineRenameInput
          defaultName={defaultName}
          isEditing={isEditing}
          node={node}
          onStartEditing={startEditing}
          onStopEditing={stopEditing}
        />
      }
      nodeId={node.id}
      onClick={handleClick}
      onDoubleClick={startEditing}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
