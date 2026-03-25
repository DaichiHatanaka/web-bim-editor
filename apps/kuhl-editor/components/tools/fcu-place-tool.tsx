'use client'

import useEditor from '../../store/use-editor'

/**
 * FcuPlaceTool
 *
 * FCU（ファンコイルユニット）を配置するツール。
 * 実装予定: TASK-0025
 */
export function FcuPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'fcu_place'

  if (!isActive) return null

  return null
}

export default FcuPlaceTool
