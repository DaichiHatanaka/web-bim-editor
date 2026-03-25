'use client'

import useEditor from '../../store/use-editor'

/**
 * DuctRouteTool
 *
 * ダクト経路を設定するツール。
 * 実装予定: TASK-未定
 */
export function DuctRouteTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'duct_route'

  if (!isActive) return null

  return null
}

export default DuctRouteTool
