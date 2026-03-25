'use client'

import useEditor from '../../store/use-editor'

/**
 * PipeSizingTool
 *
 * 配管設計（サイジング）を実行するツール。
 * 実装予定: TASK-未定
 */
export function PipeSizingTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'pipe_sizing'

  if (!isActive) return null

  return null
}

export default PipeSizingTool
