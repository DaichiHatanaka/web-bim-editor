'use client'

import { useMemo } from 'react'
import useEditor, { type Tool } from '../store/use-editor'
import { ZoneDrawTool } from './tools/zone-draw-tool'
import { ZoneEditTool } from './tools/zone-edit-tool'
import { LoadCalcTool } from './tools/load-calc-tool'
import { AhuPlaceTool } from './tools/ahu-place-tool'
import { PacPlaceTool } from './tools/pac-place-tool'
import { FcuPlaceTool } from './tools/fcu-place-tool'
import { DiffuserPlaceTool } from './tools/diffuser-place-tool'
import { EquipmentEditTool } from './tools/equipment-edit-tool'
import { DuctRouteTool } from './tools/duct-route-tool'
import { PipeRouteTool } from './tools/pipe-route-tool'
import { FittingPlaceTool } from './tools/fitting-place-tool'
import { RouteEditTool } from './tools/route-edit-tool'
import { DuctSizingTool } from './tools/duct-sizing-tool'
import { PipeSizingTool } from './tools/pipe-sizing-tool'
import { QuantityTakeoffTool } from './tools/quantity-takeoff-tool'

/**
 * ToolManager
 *
 * useEditor.tool の値に応じて適切なツールコンポーネントをレンダリングします。
 * ツール規約:
 * - 各ツールは独自の内部状態を持ち、ツールがアクティブでない場合は null を返す
 * - useScene のみ変更（直接 Three.js API 呼び出し禁止）
 * - アクティブツールのコンポーネントのみをレンダリング
 */
export function ToolManager() {
  const tool = useEditor((s) => s.tool)

  const toolComponent = useMemo(() => {
    const toolMap: Record<Tool, React.ReactNode> = {
      select: null,
      zone_draw: <ZoneDrawTool key="zone_draw" />,
      zone_edit: <ZoneEditTool key="zone_edit" />,
      load_calc: <LoadCalcTool key="load_calc" />,
      ahu_place: <AhuPlaceTool key="ahu_place" />,
      pac_place: <PacPlaceTool key="pac_place" />,
      fcu_place: <FcuPlaceTool key="fcu_place" />,
      diffuser_place: <DiffuserPlaceTool key="diffuser_place" />,
      equipment_edit: <EquipmentEditTool key="equipment_edit" />,
      duct_route: <DuctRouteTool key="duct_route" />,
      pipe_route: <PipeRouteTool key="pipe_route" />,
      fitting_place: <FittingPlaceTool key="fitting_place" />,
      route_edit: <RouteEditTool key="route_edit" />,
      duct_sizing: <DuctSizingTool key="duct_sizing" />,
      pipe_sizing: <PipeSizingTool key="pipe_sizing" />,
      quantity_takeoff: <QuantityTakeoffTool key="quantity_takeoff" />,
    }

    return toolMap[tool]
  }, [tool])

  return toolComponent
}

export default ToolManager
