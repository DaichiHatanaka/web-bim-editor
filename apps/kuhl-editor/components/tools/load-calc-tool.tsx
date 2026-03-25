'use client'

import useEditor from '../../store/use-editor'

/**
 * LoadCalcTool
 *
 * 負荷計算を実行するツール。
 * 実装予定: TASK-0015 (LoadCalcSystem) 完了後
 */
export function LoadCalcTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'load_calc'

  if (!isActive) return null

  return null
}

export default LoadCalcTool
