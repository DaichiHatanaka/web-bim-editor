'use client'

import useEditor from '../../store/use-editor'

/**
 * AhuPlaceTool
 *
 * AHU（空調機）を配置するツール。
 * 実装予定: TASK-0025
 */
export function AhuPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'ahu_place'

  if (!isActive) return null

  return null
}

export default AhuPlaceTool
