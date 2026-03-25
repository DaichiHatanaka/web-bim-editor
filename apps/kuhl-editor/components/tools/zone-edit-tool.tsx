'use client'

import useEditor from '../../store/use-editor'

/**
 * ZoneEditTool
 *
 * ゾーン属性を編集するツール。
 * 実装予定: TASK-0025 以降
 */
export function ZoneEditTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'zone_edit'

  if (!isActive) return null

  return null
}

export default ZoneEditTool
