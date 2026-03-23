import type { RoofNode } from '@pascal-app/core'
import Image from 'next/image'
import { useSceneNodeInteractions, useTreeNodeRenameState } from './site-panel-hooks'
import { InlineRenameInput } from './inline-rename-input'
import { TreeNodeWrapper } from './tree-node'
import { TreeNodeActions } from './tree-node-actions'

interface RoofTreeNodeProps {
  node: RoofNode
  depth: number
  isLast?: boolean
}

export function RoofTreeNode({ node, depth, isLast }: RoofTreeNodeProps) {
  const { isEditing, startEditing, stopEditing } = useTreeNodeRenameState()
  const { isSelected, isHovered, handleClick, handleMouseEnter, handleMouseLeave } =
    useSceneNodeInteractions(node.id, { from: 'furnish', to: 'structure' })

  // Calculate dimensions: length × total width (leftWidth + rightWidth)
  const totalWidth = node.leftWidth + node.rightWidth
  const sizeLabel = `${node.length.toFixed(1)}×${totalWidth.toFixed(1)}m`
  const defaultName = `Roof (${sizeLabel})`

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={false}
      hasChildren={false}
      icon={
        <Image alt="" className="object-contain" height={14} src="/icons/roof.png" width={14} />
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
