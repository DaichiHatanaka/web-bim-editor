import type { ItemNode } from '@pascal-app/core'
import Image from 'next/image'
import { useState } from 'react'
import { InlineRenameInput } from './inline-rename-input'
import {
  useAutoExpandOnDescendantSelection,
  useSceneNodeInteractions,
  useTreeNodeRenameState,
} from './site-panel-hooks'
import { TreeNode, TreeNodeWrapper } from './tree-node'
import { TreeNodeActions } from './tree-node-actions'

const CATEGORY_ICONS: Record<string, string> = {
  door: '/icons/door.png',
  window: '/icons/window.png',
  furniture: '/icons/couch.png',
  appliance: '/icons/appliance.png',
  kitchen: '/icons/kitchen.png',
  bathroom: '/icons/bathroom.png',
  outdoor: '/icons/tree.png',
}

interface ItemTreeNodeProps {
  node: ItemNode
  depth: number
  isLast?: boolean
}

export function ItemTreeNode({ node, depth, isLast }: ItemTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const iconSrc = CATEGORY_ICONS[node.asset.category] || '/icons/couch.png'
  const { isEditing, startEditing, stopEditing } = useTreeNodeRenameState()
  const {
    selectedIds,
    isSelected,
    isHovered,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
  } = useSceneNodeInteractions(node.id, { from: 'structure', to: 'furnish' })
  useAutoExpandOnDescendantSelection(node.id, selectedIds, setExpanded)

  const defaultName = node.asset.name || 'Item'
  const childIds = node.children ?? []
  const hasChildren = childIds.length > 0

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={expanded}
      hasChildren={hasChildren}
      icon={<Image alt="" className="object-contain" height={14} src={iconSrc} width={14} />}
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
      {hasChildren &&
        childIds.map((childId, index) => (
          <TreeNode
            depth={depth + 1}
            isLast={index === childIds.length - 1}
            key={childId}
            nodeId={childId}
          />
        ))}
    </TreeNodeWrapper>
  )
}
