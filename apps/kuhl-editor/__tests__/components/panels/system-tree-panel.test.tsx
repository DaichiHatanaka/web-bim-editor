/**
 * TASK-0028: SystemTreePanel テスト
 */

import { describe, expect, it } from 'vitest'
import { SystemNode, AhuNode } from '@kuhl/core'

// ─── テストヘルパー ──────────────────────────────────────────────────────────

function createTestSystem(overrides = {}) {
  return SystemNode.parse({
    name: '冷水1次系統',
    parentId: null,
    systemName: '冷水1次系統',
    systemType: 'chilled_water',
    color: '#2196F3',
    memberIds: [],
    ...overrides,
  })
}

function createTestAhu(overrides = {}) {
  return AhuNode.parse({
    name: 'AHU-101',
    parentId: 'level_test',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    dimensions: [2, 1.5, 1],
    tag: 'AHU-101',
    equipmentName: 'AHU-101',
    lod: '100',
    status: 'planned',
    ports: [],
    ...overrides,
  })
}

// ─── 純粋関数テスト: getSystemsFromScene ──────────────────────────────────────

describe('getSystemsFromScene', () => {
  it('TC-010: system型ノードのみ抽出', async () => {
    const { getSystemsFromScene } = await import(
      '../../../components/panels/system-tree-panel'
    )
    const sys = createTestSystem()
    const ahu = createTestAhu()
    const nodes = { [sys.id]: sys, [ahu.id]: ahu } as Record<string, any>
    const result = getSystemsFromScene(nodes)
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('system')
  })

  it('TC-011: 空のnodesで空配列', async () => {
    const { getSystemsFromScene } = await import(
      '../../../components/panels/system-tree-panel'
    )
    expect(getSystemsFromScene({})).toHaveLength(0)
  })
})

// ─── 純粋関数テスト: filterBySystemType ───────────────────────────────────────

describe('filterBySystemType', () => {
  it('TC-012: systemType=supply_air でフィルタ', async () => {
    const { filterBySystemType } = await import(
      '../../../components/panels/system-tree-panel'
    )
    const sys1 = createTestSystem({ systemType: 'supply_air' })
    const sys2 = createTestSystem({ systemType: 'chilled_water' })
    const result = filterBySystemType([sys1, sys2] as any, 'supply_air')
    expect(result).toHaveLength(1)
    expect((result[0] as any).systemType).toBe('supply_air')
  })

  it('TC-013: filterType=undefined で全件', async () => {
    const { filterBySystemType } = await import(
      '../../../components/panels/system-tree-panel'
    )
    const sys1 = createTestSystem({ systemType: 'supply_air' })
    const sys2 = createTestSystem({ systemType: 'chilled_water' })
    const result = filterBySystemType([sys1, sys2] as any, undefined)
    expect(result).toHaveLength(2)
  })
})

// ─── 純粋関数テスト: getSystemMembers ─────────────────────────────────────────

describe('getSystemMembers', () => {
  it('TC-014: memberIds から対応ノードを取得', async () => {
    const { getSystemMembers } = await import(
      '../../../components/panels/system-tree-panel'
    )
    const ahu = createTestAhu()
    const nodes = { [ahu.id]: ahu } as Record<string, any>
    const result = getSystemMembers([ahu.id], nodes)
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe(ahu.id)
  })

  it('TC-015: 存在しないIDはスキップ', async () => {
    const { getSystemMembers } = await import(
      '../../../components/panels/system-tree-panel'
    )
    const result = getSystemMembers(['nonexistent_id'], {})
    expect(result).toHaveLength(0)
  })
})

// ─── 定数テスト: SYSTEM_TYPE_LABELS ───────────────────────────────────────────

describe('SYSTEM_TYPE_LABELS', () => {
  it('TC-016: 全8種のラベルが定義されている', async () => {
    const { SYSTEM_TYPE_LABELS } = await import(
      '../../../components/panels/system-tree-panel'
    )
    const types = [
      'chilled_water', 'hot_water', 'condenser_water', 'refrigerant',
      'supply_air', 'return_air', 'exhaust_air', 'outside_air',
    ]
    for (const t of types) {
      expect(SYSTEM_TYPE_LABELS[t as keyof typeof SYSTEM_TYPE_LABELS]).toBeDefined()
    }
    expect(Object.keys(SYSTEM_TYPE_LABELS)).toHaveLength(8)
  })
})
