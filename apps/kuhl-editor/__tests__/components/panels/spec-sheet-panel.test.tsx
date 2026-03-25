/**
 * TASK-0027: SpecSheetPanel テスト
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AhuNode, PacNode, DiffuserNode, FanNode, useScene } from '@kuhl/core'

// ─── テスト用ヘルパー ────────────────────────────────────────────────────────

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
    coolingCapacity: 56,
    heatingCapacity: 40,
    airflowRate: 10000,
    staticPressure: 500,
    ...overrides,
  })
}

function createTestPac(overrides = {}) {
  return PacNode.parse({
    name: 'PAC-101',
    parentId: 'level_test',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    dimensions: [1, 0.3, 1],
    tag: 'PAC-101',
    equipmentName: 'PAC-101',
    lod: '100',
    status: 'planned',
    subType: 'ceiling_cassette',
    ports: [],
    coolingCapacity: 14,
    cop: 4.5,
    ...overrides,
  })
}

function createTestDiffuser(overrides = {}) {
  return DiffuserNode.parse({
    name: 'DIFF-101',
    parentId: 'level_test',
    position: [0, 2.7, 0],
    rotation: [0, 0, 0],
    dimensions: [0.6, 0.15, 0.6],
    tag: 'DIFF-101',
    equipmentName: 'DIFF-101',
    lod: '100',
    status: 'planned',
    subType: 'anemo',
    ceilingMounted: true,
    ports: [],
    airflowRate: 500,
    neckSize: 'Φ200',
    ...overrides,
  })
}

function createTestFan(overrides = {}) {
  return FanNode.parse({
    name: 'FAN-101',
    parentId: 'level_test',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    dimensions: [0.8, 0.6, 0.8],
    tag: 'FAN-101',
    equipmentName: 'FAN-101',
    lod: '100',
    status: 'planned',
    ports: [],
    ...overrides,
  })
}

// ─── 純粋関数テスト: getSelectedEquipment ─────────────────────────────────────

describe('getSelectedEquipment', () => {
  it('TC-001: selectedIds にAHU IDがある場合、AHUノードを返す', async () => {
    const { getSelectedEquipment } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const ahu = createTestAhu()
    const nodes = { [ahu.id]: ahu } as Record<string, any>
    const result = getSelectedEquipment(nodes, [ahu.id])
    expect(result).not.toBeNull()
    expect(result!.type).toBe('ahu')
  })

  it('TC-002: selectedIds が空の場合、null を返す', async () => {
    const { getSelectedEquipment } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const result = getSelectedEquipment({}, [])
    expect(result).toBeNull()
  })

  it('TC-003: selectedIds に非機器ノードがある場合、null を返す', async () => {
    const { getSelectedEquipment } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const nodes = { zone_test: { id: 'zone_test', type: 'hvac_zone' } } as Record<string, any>
    const result = getSelectedEquipment(nodes, ['zone_test'])
    expect(result).toBeNull()
  })
})

// ─── 純粋関数テスト: getEquipmentFormType ─────────────────────────────────────

describe('getEquipmentFormType', () => {
  it('TC-004: AHUノード → ahu', async () => {
    const { getEquipmentFormType } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const ahu = createTestAhu()
    expect(getEquipmentFormType(ahu)).toBe('ahu')
  })

  it('TC-005: PACノード → pac', async () => {
    const { getEquipmentFormType } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const pac = createTestPac()
    expect(getEquipmentFormType(pac)).toBe('pac')
  })

  it('TC-006: Diffuserノード → diffuser', async () => {
    const { getEquipmentFormType } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const diff = createTestDiffuser()
    expect(getEquipmentFormType(diff)).toBe('diffuser')
  })

  it('TC-007: Fanノード → fan', async () => {
    const { getEquipmentFormType } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const fan = createTestFan()
    expect(getEquipmentFormType(fan)).toBe('fan')
  })
})

// ─── 純粋関数テスト: getCommonFields ──────────────────────────────────────────

describe('getCommonFields', () => {
  it('TC-008: 共通フィールドを正しく抽出', async () => {
    const { getCommonFields } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const ahu = createTestAhu({ manufacturer: 'Daikin', systemId: 'sys_1' })
    const fields = getCommonFields(ahu)
    expect(fields.tag).toBe('AHU-101')
    expect(fields.equipmentName).toBe('AHU-101')
    expect(fields.manufacturer).toBe('Daikin')
    expect(fields.systemId).toBe('sys_1')
    expect(fields.status).toBe('planned')
  })
})

// ─── 純粋関数テスト: getAhuSpecFields ─────────────────────────────────────────

describe('getAhuSpecFields', () => {
  it('TC-009: AHU固有フィールドを抽出', async () => {
    const { getAhuSpecFields } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const ahu = createTestAhu({ motorPower: 7.5, filterGrade: '中性能' })
    const fields = getAhuSpecFields(ahu)
    expect(fields.coolingCapacity).toBe(56)
    expect(fields.heatingCapacity).toBe(40)
    expect(fields.airflowRate).toBe(10000)
    expect(fields.staticPressure).toBe(500)
    expect(fields.motorPower).toBe(7.5)
    expect(fields.filterGrade).toBe('中性能')
  })
})

// ─── 純粋関数テスト: getPacSpecFields ─────────────────────────────────────────

describe('getPacSpecFields', () => {
  it('TC-010: PAC固有フィールドを抽出', async () => {
    const { getPacSpecFields } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const pac = createTestPac({ refrigerantType: 'R32', ratedPower: 3.5 })
    const fields = getPacSpecFields(pac)
    expect(fields.coolingCapacity).toBe(14)
    expect(fields.cop).toBe(4.5)
    expect(fields.refrigerantType).toBe('R32')
    expect(fields.ratedPower).toBe(3.5)
  })
})

// ─── 純粋関数テスト: getDiffuserSpecFields ────────────────────────────────────

describe('getDiffuserSpecFields', () => {
  it('TC-011: Diffuser固有フィールドを抽出', async () => {
    const { getDiffuserSpecFields } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    const diff = createTestDiffuser({ throwDistance: 3.5, noiseLevel: 35 })
    const fields = getDiffuserSpecFields(diff)
    expect(fields.airflowRate).toBe(500)
    expect(fields.neckSize).toBe('Φ200')
    expect(fields.throwDistance).toBe(3.5)
    expect(fields.noiseLevel).toBe(35)
  })
})

// ─── 統合テスト: updateEquipmentField ─────────────────────────────────────────

describe('updateEquipmentField integration', () => {
  let ahuId: string

  beforeEach(() => {
    const ahu = createTestAhu()
    ahuId = ahu.id
    useScene.setState({ nodes: { [ahuId]: ahu }, dirtyNodes: new Set() })
  })

  afterEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
  })

  it('TC-012: tag更新→updateNodeが反映される', async () => {
    const { updateEquipmentField } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    updateEquipmentField(ahuId, 'tag', 'AHU-201')
    const node = useScene.getState().nodes[ahuId] as any
    expect(node.tag).toBe('AHU-201')
  })

  it('TC-013: coolingCapacity更新→updateNodeが反映される', async () => {
    const { updateEquipmentField } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    updateEquipmentField(ahuId, 'coolingCapacity', 71)
    const node = useScene.getState().nodes[ahuId] as any
    expect(node.coolingCapacity).toBe(71)
  })

  it('TC-014: 数値フィールドの文字列→数値変換', async () => {
    const { parseFieldValue } = await import(
      '../../../components/panels/spec-sheet-panel'
    )
    expect(parseFieldValue('coolingCapacity', '56.5')).toBe(56.5)
    expect(parseFieldValue('tag', 'AHU-101')).toBe('AHU-101')
    expect(parseFieldValue('airflowRate', '')).toBeUndefined()
  })
})
