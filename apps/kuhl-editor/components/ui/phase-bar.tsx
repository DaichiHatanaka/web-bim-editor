'use client'

import { useMemo } from 'react'
import useEditor, { phaseTools, type Phase } from '../../store/use-editor'

/**
 * PhaseBar
 *
 * トップバー。5フェーズのタブ/ボタン。日本語ラベル: ゾーニング, 機器, ルート, 計算, 拾い。
 * ワンクリック切替、アクティブフェーズのハイライト、フェーズ内の利用可能ツール表示。
 */
export function PhaseBar() {
  const phase = useEditor((s) => s.phase)
  const setPhase = useEditor((s) => s.setPhase)

  const phases: { value: Phase; label: string; icon?: string }[] = useMemo(
    () => [
      { value: 'zone', label: 'ゾーニング' },
      { value: 'equip', label: '機器' },
      { value: 'route', label: 'ルート' },
      { value: 'calc', label: '計算' },
      { value: 'takeoff', label: '拾い' },
    ],
    [],
  )

  return (
    <div className="phase-bar bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-1 px-4 py-3">
        {phases.map((p) => (
          <button
            key={p.value}
            data-phase={p.value}
            onClick={() => setPhase(p.value)}
            className={`
              px-4 py-2 rounded-md transition-colors font-medium text-sm
              ${
                phase === p.value
                  ? 'active bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            title={`フェーズ: ${p.label}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Available tools display for current phase */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-600">
        <span className="font-semibold">利用可能ツール: </span>
        <span>{getToolLabels(phaseTools[phase]).join(' / ')}</span>
      </div>
    </div>
  )
}

/**
 * ツール名を日本語ラベルに変換
 */
function getToolLabels(tools: readonly string[]): string[] {
  const toolLabelMap: Record<string, string> = {
    select: '選択',
    zone_draw: 'ゾーン描画',
    zone_edit: 'ゾーン編集',
    load_calc: '負荷計算',
    ahu_place: 'AHU配置',
    pac_place: 'PAC配置',
    fcu_place: 'FCU配置',
    diffuser_place: 'ディフューザ配置',
    equipment_edit: '機器編集',
    duct_route: 'ダクト経路',
    pipe_route: '配管経路',
    fitting_place: 'フィッティング配置',
    route_edit: '経路編集',
    duct_sizing: 'ダクト設計',
    pipe_sizing: '配管設計',
    quantity_takeoff: '数量拾い',
  }

  return tools.map((tool) => toolLabelMap[tool] || tool)
}

export default PhaseBar
