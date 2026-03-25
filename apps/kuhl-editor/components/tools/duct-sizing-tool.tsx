'use client'

import useEditor from '../../store/use-editor'

/**
 * DuctSizingTool
 *
 * ダクト設計（サイジング）を実行するツール。
 * 実装予定: TASK-未定
 */
export function DuctSizingTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'duct_sizing'

  if (!isActive) return null

  return null
}

export default DuctSizingTool
