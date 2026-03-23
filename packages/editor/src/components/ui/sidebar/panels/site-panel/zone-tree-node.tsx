import { useScene, type ZoneNode } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { ColorDot } from './../../../../../components/ui/primitives/color-dot'
import { InlineRenameInput } from './inline-rename-input'
import { useTreeNodeHover, useTreeNodeRenameState } from './site-panel-hooks'
import { formatPolygonAreaName } from './site-panel-math'
import { TreeNodeWrapper } from './tree-node'
import { TreeNodeActions } from './tree-node-actions'

interface ZoneTreeNodeProps {
  node: ZoneNode
  depth: number
  isLast?: boolean
}

export function ZoneTreeNode({ node, depth, isLast }: ZoneTreeNodeProps) {
  const updateNode = useScene((state) => state.updateNode)
  const { isEditing, startEditing, stopEditing } = useTreeNodeRenameState()
  const { isHovered, handleMouseEnter, handleMouseLeave } = useTreeNodeHover(node.id)
  const isSelected = useViewer((state) => state.selection.zoneId === node.id)
  const setSelection = useViewer((state) => state.setSelection)

  const handleClick = () => {
    setSelection({ zoneId: node.id })
  }

  const defaultName = formatPolygonAreaName('Zone', node.polygon)

  return (
    <TreeNodeWrapper
      actions={<TreeNodeActions node={node} />}
      depth={depth}
      expanded={false}
      hasChildren={false}
      icon={<ColorDot color={node.color} onChange={(color) => updateNode(node.id, { color })} />}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onToggle={() => {}}
    />
  )
}
