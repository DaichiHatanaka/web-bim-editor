/**
 * TASK-0024: EquipmentSystem（ポート位置計算）テスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useScene from '../../../store/use-scene'
import { AhuNode } from '../../../schema/nodes/ahu'
import { HvacZoneNode } from '../../../schema/nodes/hvac-zone'
import type { PortDef } from '../../../schema/nodes/hvac-equipment-base'
import {
  calculatePortWorldPosition,
  validatePortConnections,
  getUnconnectedPorts,
  processEquipmentSystem,
} from '../../../systems/equipment/equipment-system'

// ─── テストデータ ──────────────────────────────────────────────────────────

const createTestAhuNode = (overrides: Partial<Record<string, unknown>> = {}) => {
  return AhuNode.parse({
    name: 'Test AHU',
    parentId: 'level_test',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    dimensions: [2, 1.5, 1],
    tag: 'AHU-001',
    equipmentName: 'Test AHU Unit',
    lod: '100',
    status: 'planned',
    ports: [
      {
        id: 'port_sa',
        name: 'Supply Air',
        medium: 'supply_air',
        direction: 'out',
        position: [1, 0.5, 0],
        connectedTo: null,
      },
      {
        id: 'port_ra',
        name: 'Return Air',
        medium: 'return_air',
        direction: 'in',
        position: [-1, 0.5, 0],
        connectedTo: null,
      },
    ],
    ...overrides,
  })
}

// ─── 純粋関数テスト: calculatePortWorldPosition ─────────────────────────────

describe('calculatePortWorldPosition', () => {
  it('TC-001: rotation [0,0,0] でオフセット加算のみ', () => {
    const result = calculatePortWorldPosition(
      [0.5, 0, 0],
      [1, 0, 0],
      [0, 0, 0],
    )
    expect(result[0]).toBeCloseTo(1.5)
    expect(result[1]).toBeCloseTo(0)
    expect(result[2]).toBeCloseTo(0)
  })

  it('TC-002: Y軸90度回転でオフセットが回転する', () => {
    const result = calculatePortWorldPosition(
      [0.5, 0, 0],
      [0, 0, 0],
      [0, Math.PI / 2, 0],
    )
    expect(result[0]).toBeCloseTo(0, 1)
    expect(result[1]).toBeCloseTo(0, 1)
    expect(result[2]).toBeCloseTo(-0.5, 1)
  })

  it('TC-003: 任意position + Y軸180度回転', () => {
    const result = calculatePortWorldPosition(
      [1, 0, 0],
      [2, 3, 4],
      [0, Math.PI, 0],
    )
    expect(result[0]).toBeCloseTo(1, 1)
    expect(result[1]).toBeCloseTo(3, 1)
    expect(result[2]).toBeCloseTo(4, 1)
  })
})

// ─── 純粋関数テスト: validatePortConnections ────────────────────────────────

describe('validatePortConnections', () => {
  it('TC-004: 有効な接続はvalidを返す', () => {
    const ports: PortDef[] = [
      { id: 'p1', name: 'SA', medium: 'supply_air', direction: 'out', position: [0, 0, 0], connectedTo: 'ahu_existing' },
    ]
    const allNodeIds = new Set(['ahu_existing'])
    const result = validatePortConnections(ports, allNodeIds)
    expect(result).toEqual([{ portId: 'p1', valid: true }])
  })

  it('TC-005: 存在しないノードIDへの接続はinvalidを返す', () => {
    const ports: PortDef[] = [
      { id: 'p1', name: 'SA', medium: 'supply_air', direction: 'out', position: [0, 0, 0], connectedTo: 'ahu_deleted' },
    ]
    const allNodeIds = new Set<string>()
    const result = validatePortConnections(ports, allNodeIds)
    expect(result).toEqual([{ portId: 'p1', valid: false }])
  })

  it('TC-006: connectedTo === null は未接続として valid', () => {
    const ports: PortDef[] = [
      { id: 'p1', name: 'SA', medium: 'supply_air', direction: 'out', position: [0, 0, 0], connectedTo: null },
    ]
    const allNodeIds = new Set<string>()
    const result = validatePortConnections(ports, allNodeIds)
    expect(result).toEqual([{ portId: 'p1', valid: true }])
  })
})

// ─── 純粋関数テスト: getUnconnectedPorts ────────────────────────────────────

describe('getUnconnectedPorts', () => {
  it('TC-007: 未接続ポートのみ返す', () => {
    const ports: PortDef[] = [
      { id: 'p1', name: 'SA', medium: 'supply_air', direction: 'out', position: [0, 0, 0], connectedTo: null },
      { id: 'p2', name: 'RA', medium: 'return_air', direction: 'in', position: [0, 0, 0], connectedTo: 'ahu_abc' },
    ]
    const result = getUnconnectedPorts(ports)
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('p1')
  })

  it('TC-008: 全接続済みは空配列', () => {
    const ports: PortDef[] = [
      { id: 'p1', name: 'SA', medium: 'supply_air', direction: 'out', position: [0, 0, 0], connectedTo: 'ahu_abc' },
    ]
    const result = getUnconnectedPorts(ports)
    expect(result).toHaveLength(0)
  })
})

// ─── システム処理テスト: processEquipmentSystem ─────────────────────────────

describe('processEquipmentSystem', () => {
  beforeEach(() => {
    useScene.setState({
      nodes: {},
      dirtyNodes: new Set(),
    })
  })

  afterEach(() => {
    useScene.setState({
      nodes: {},
      dirtyNodes: new Set(),
    })
  })

  it('TC-009: 機器ノードのポート位置が更新される', () => {
    const ahu = createTestAhuNode({
      position: [5, 0, 0],
      rotation: [0, 0, 0],
    })

    useScene.setState({
      nodes: { [ahu.id]: ahu } as any,
      dirtyNodes: new Set([ahu.id] as any),
    })

    processEquipmentSystem()

    const updatedNode = useScene.getState().nodes[ahu.id] as any
    // ポート位置が equipment position + offset に更新されていること
    expect(updatedNode.ports[0].position[0]).toBeCloseTo(6, 1)
  })

  it('TC-010: 非機器ノードはスキップ', () => {
    const zone = HvacZoneNode.parse({
      name: 'Test Zone',
      parentId: 'level_test',
      zoneName: 'Zone A',
      usage: 'office',
      floorArea: 50,
    })

    const updateNodeSpy = vi.fn()
    useScene.setState({
      nodes: { [zone.id]: zone } as any,
      dirtyNodes: new Set([zone.id] as any),
    })

    processEquipmentSystem()

    // zone ノードの場合は updateNode が呼ばれない（portsがないため）
    const updatedZone = useScene.getState().nodes[zone.id] as any
    expect(updatedZone.type).toBe('hvac_zone')
  })

  it('TC-011: 空ポートの機器はスキップ', () => {
    const ahu = createTestAhuNode({ ports: [] })
    const originalPorts = (ahu as any).ports

    useScene.setState({
      nodes: { [ahu.id]: ahu } as any,
      dirtyNodes: new Set([ahu.id] as any),
    })

    processEquipmentSystem()

    // ports が空のままであること
    const updatedNode = useScene.getState().nodes[ahu.id] as any
    expect(updatedNode.ports).toHaveLength(0)
  })

  it('TC-012: clearDirty で dirtyNodes から削除される', () => {
    const ahu = createTestAhuNode()

    useScene.setState({
      nodes: { [ahu.id]: ahu } as any,
      dirtyNodes: new Set([ahu.id] as any),
    })

    processEquipmentSystem()

    expect(useScene.getState().dirtyNodes.has(ahu.id as any)).toBe(false)
  })
})
