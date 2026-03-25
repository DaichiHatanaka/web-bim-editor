'use client'

import useEditor from '../../store/use-editor'

/**
 * FittingPlaceTool
 *
 * フィッティングを配置するツール。
 * 実装予定: TASK-未定
 */
export function FittingPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'fitting_place'

  if (!isActive) return null

  return null
}

export default FittingPlaceTool
