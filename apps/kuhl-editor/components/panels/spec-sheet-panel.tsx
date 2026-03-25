/**
 * spec-sheet-panel.tsx
 * 諸元表パネル コアロジック（JSXなし、node環境テスト可能）
 *
 * 【機能概要】: 選択中機器の性能諸元を表示・編集するための
 * 純粋関数群・型定義を提供する。
 * UI コンポーネント実装は spec-sheet-panel-view.tsx に分離。
 *
 * 【参照要件】: REQ-204, REQ-206, REQ-207
 */

import type { AnyNode } from '@kuhl/core'
import { useScene } from '@kuhl/core'

// ================================================================
// 型定義
// ================================================================

export type EquipmentFormType = 'ahu' | 'pac' | 'diffuser' | 'fan' | 'other'

export interface CommonFields {
  tag: string
  equipmentName: string
  manufacturer?: string
  systemId?: string
  status: string
}

export interface AhuSpecFields {
  coolingCapacity?: number
  heatingCapacity?: number
  airflowRate?: number
  staticPressure?: number
  motorPower?: number
  filterGrade?: string
  voltage?: string
  phase?: string
}

export interface PacSpecFields {
  coolingCapacity?: number
  cop?: number
  refrigerantType?: string
  ratedPower?: number
}

export interface DiffuserSpecFields {
  airflowRate?: number
  neckSize?: string
  throwDistance?: number
  noiseLevel?: number
}

// ================================================================
// 機器タイプ判定
// ================================================================

const EQUIPMENT_TYPES = new Set([
  'ahu', 'pac', 'fcu', 'vrf_outdoor', 'vrf_indoor', 'diffuser',
  'damper', 'fan', 'pump', 'chiller', 'boiler', 'cooling_tower', 'valve',
])

function isEquipmentNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>
  return typeof n.type === 'string' && EQUIPMENT_TYPES.has(n.type)
}

// ================================================================
// 数値フィールド一覧（parseFieldValueで使用）
// ================================================================

const NUMERIC_FIELDS = new Set([
  'coolingCapacity', 'heatingCapacity', 'airflowRate', 'staticPressure',
  'motorPower', 'cop', 'ratedPower', 'ratedCurrent', 'refrigerantCharge',
  'effectiveArea', 'throwDistance', 'noiseLevel',
])

// ================================================================
// 純粋関数
// ================================================================

/**
 * selectedIds から最初の機器ノードを取得する
 */
export function getSelectedEquipment(
  nodes: Record<string, AnyNode>,
  selectedIds: string[],
): AnyNode | null {
  if (selectedIds.length === 0) return null

  const node = nodes[selectedIds[0]!]
  if (!node || !isEquipmentNode(node)) return null

  return node
}

/**
 * ノードの type からフォームタイプを判定する
 */
export function getEquipmentFormType(node: AnyNode): EquipmentFormType {
  switch (node.type) {
    case 'ahu':
      return 'ahu'
    case 'pac':
      return 'pac'
    case 'diffuser':
      return 'diffuser'
    case 'fan':
      return 'fan'
    default:
      return 'other'
  }
}

/**
 * 機器ノードから共通フィールドを抽出する
 */
export function getCommonFields(node: AnyNode): CommonFields {
  const n = node as any
  return {
    tag: n.tag ?? '',
    equipmentName: n.equipmentName ?? '',
    manufacturer: n.manufacturer,
    systemId: n.systemId,
    status: n.status ?? 'planned',
  }
}

/**
 * AHUノードからAHU固有フィールドを抽出する
 */
export function getAhuSpecFields(node: AnyNode): AhuSpecFields {
  const n = node as any
  return {
    coolingCapacity: n.coolingCapacity,
    heatingCapacity: n.heatingCapacity,
    airflowRate: n.airflowRate,
    staticPressure: n.staticPressure,
    motorPower: n.motorPower,
    filterGrade: n.filterGrade,
    voltage: n.voltage,
    phase: n.phase,
  }
}

/**
 * PACノードからPAC固有フィールドを抽出する
 */
export function getPacSpecFields(node: AnyNode): PacSpecFields {
  const n = node as any
  return {
    coolingCapacity: n.coolingCapacity,
    cop: n.cop,
    refrigerantType: n.refrigerantType,
    ratedPower: n.ratedPower,
  }
}

/**
 * DiffuserノードからDiffuser固有フィールドを抽出する
 */
export function getDiffuserSpecFields(node: AnyNode): DiffuserSpecFields {
  const n = node as any
  return {
    airflowRate: n.airflowRate,
    neckSize: n.neckSize,
    throwDistance: n.throwDistance,
    noiseLevel: n.noiseLevel,
  }
}

/**
 * フィールド値を適切な型に変換する
 */
export function parseFieldValue(
  fieldName: string,
  value: string,
): string | number | undefined {
  if (value === '') return undefined

  if (NUMERIC_FIELDS.has(fieldName)) {
    const num = Number.parseFloat(value)
    return Number.isNaN(num) ? undefined : num
  }

  return value
}

/**
 * 機器フィールドを更新する
 */
export function updateEquipmentField(
  nodeId: string,
  fieldName: string,
  value: unknown,
): void {
  const { updateNode } = useScene.getState()
  updateNode(nodeId, { [fieldName]: value } as any)
}
