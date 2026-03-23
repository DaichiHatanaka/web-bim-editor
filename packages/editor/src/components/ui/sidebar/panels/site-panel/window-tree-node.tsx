'use client'

import type { WindowNode } from '@pascal-app/core'
import Image from 'next/image'
import { useSceneNodeInteractions, useTreeNodeRenameState } from './site-panel-hooks'
import { InlineRenameInput } from './inline-rename-input'
import { TreeNodeWrapper } from './tree-node'
import { TreeNodeActions } from './tree-node-actions'

interface WindowTreeNodeProps {
  node: WindowNode
  depth: number
  isLast?: boolean
}

export function WindowTreeNode({ node, depth, isLast }: WindowTreeNodeProps) {
  const { isEditing, startEditing, stopEditing } = useTreeNodeRenameState()
  const { isSelected, isHovered, handleClick, handleMouseEnter, handleMouseLeave } =
    useSceneNodeInteractions(node.id, { from: 'furnish', to: 'structure' })

  const defaultName = 'Window'

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={false}
      hasChildren={false}
      icon={
        <Image alt="" className="object-contain" height={14} src="/icons/window.png" width={14} />
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
      onToggle={() => {}}
    />
  )
}
