'use client'

import useEditor from '../../store/use-editor'

/**
 * PacPlaceTool
 *
 * PAC（パッケージ型空調機）を配置するツール。
 * 実装予定: TASK-0025
 */
export function PacPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'pac_place'

  if (!isActive) return null

  return null
}

export default PacPlaceTool
