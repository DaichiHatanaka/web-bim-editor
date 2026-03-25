'use client'

import useEditor from '../../store/use-editor'

/**
 * PipeRouteTool
 *
 * 配管経路を設定するツール。
 * 実装予定: TASK-未定
 */
export function PipeRouteTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'pipe_route'

  if (!isActive) return null

  return null
}

export default PipeRouteTool
