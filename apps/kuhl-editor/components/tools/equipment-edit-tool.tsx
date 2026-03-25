'use client'

import useEditor from '../../store/use-editor'

/**
 * EquipmentEditTool
 *
 * 機器属性を編集するツール。
 * 実装予定: TASK-0027
 */
export function EquipmentEditTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'equipment_edit'

  if (!isActive) return null

  return null
}

export default EquipmentEditTool
