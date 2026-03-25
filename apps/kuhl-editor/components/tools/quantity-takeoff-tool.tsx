'use client'

import useEditor from '../../store/use-editor'

/**
 * QuantityTakeoffTool
 *
 * 数量拾い（積算）を実行するツール。
 * 実装予定: TASK-未定
 */
export function QuantityTakeoffTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'quantity_takeoff'

  if (!isActive) return null

  return null
}

export default QuantityTakeoffTool
