'use client'

import useEditor from '../../store/use-editor'

/**
 * RouteEditTool
 *
 * 経路属性を編集するツール。
 * 実装予定: TASK-未定
 */
export function RouteEditTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'route_edit'

  if (!isActive) return null

  return null
}

export default RouteEditTool
