'use client'

import useEditor from '../../store/use-editor'

/**
 * DiffuserPlaceTool
 *
 * ディフューザを配置するツール。
 * 実装予定: TASK-0026
 */
export function DiffuserPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'diffuser_place'

  if (!isActive) return null

  return null
}

export default DiffuserPlaceTool
