/**
 * system-tree-panel.tsx
 * 系統ツリーパネル コアロジック（JSXなし、node環境テスト可能）
 *
 * 【機能概要】: SystemNode一覧を取得し、系統別フィルタ・メンバー表示のための
 * 純粋関数群・型定義・定数を提供する。
 * UI コンポーネント実装は system-tree-panel-view.tsx に分離。
 *
 * 【参照要件】: REQ-207
 */

import type { AnyNode, SystemNode, SystemType } from '@kuhl/core'

// ================================================================
// 型定義
// ================================================================

export interface SystemTreePanelProps {
  filterType?: SystemType
  onSystemSelect?: (systemId: string) => void
}

// ================================================================
// 定数定義
// ================================================================

/**
 * SystemType の全8種に対応する日本語ラベルマップ
 */
export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  chilled_water: '冷水',
  hot_water: '温水',
  condenser_water: '冷却水',
  refrigerant: '冷媒',
  supply_air: '給気',
  return_air: '還気',
  exhaust_air: '排気',
  outside_air: '外気',
}

// ================================================================
// 純粋関数
// ================================================================

/**
 * nodes辞書から system 型のノードのみを抽出する
 */
export function getSystemsFromScene(
  nodes: Record<string, AnyNode>,
): SystemNode[] {
  return Object.values(nodes).filter(
    (n): n is SystemNode => n.type === 'system',
  )
}

/**
 * systemType でフィルタする
 */
export function filterBySystemType(
  systems: SystemNode[],
  filterType?: SystemType,
): SystemNode[] {
  if (filterType === undefined) return systems
  return systems.filter((s) => s.systemType === filterType)
}

/**
 * memberIds から対応するノードを取得する
 */
export function getSystemMembers(
  memberIds: string[],
  nodes: Record<string, AnyNode>,
): AnyNode[] {
  return memberIds
    .map((id) => nodes[id])
    .filter((n): n is AnyNode => n !== undefined)
}
