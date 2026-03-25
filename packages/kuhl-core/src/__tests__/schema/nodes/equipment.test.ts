import { describe, expect, it } from 'vitest'
import { AhuNode } from '../../../schema/nodes/ahu'
import { PacNode } from '../../../schema/nodes/pac'
import { DiffuserNode } from '../../../schema/nodes/diffuser'
import { FcuNode } from '../../../schema/nodes/fcu'
import { VrfOutdoorNode } from '../../../schema/nodes/vrf-outdoor'
import { VrfIndoorNode } from '../../../schema/nodes/vrf-indoor'
import { DamperNode } from '../../../schema/nodes/damper'
import { FanNode } from '../../../schema/nodes/fan'
import { PumpNode } from '../../../schema/nodes/pump'
import { ChillerNode } from '../../../schema/nodes/chiller'
import { BoilerNode } from '../../../schema/nodes/boiler'
import { CoolingTowerNode } from '../../../schema/nodes/cooling-tower'
import { ValveNode } from '../../../schema/nodes/valve'

const baseEquipmentData = {
  tag: 'TEST-001',
  equipmentName: 'テスト機器',
  position: [0, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  dimensions: [1, 1, 1] as [number, number, number],
  lod: '100' as const,
  status: 'planned' as const,
}

// ========================================
// AhuNode
// ========================================
describe('AhuNode', () => {
  it('parses with ahu_ prefixed ID and type "ahu"', () => {
    const result = AhuNode.parse({
      ...baseEquipmentData,
      tag: 'AHU-101',
      equipmentName: '空調機No.1',
    })
    expect(result.id).toMatch(/^ahu_[a-z0-9]+$/)
    expect(result.type).toBe('ahu')
    expect(result.children).toEqual([])
  })

  it('accepts all performance specs', () => {
    const result = AhuNode.parse({
      ...baseEquipmentData,
      coolingCapacity: 50,
      heatingCapacity: 30,
      airflowRate: 5000,
      staticPressure: 600,
      motorPower: 7.5,
    })
    expect(result.coolingCapacity).toBe(50)
    expect(result.airflowRate).toBe(5000)
    expect(result.staticPressure).toBe(600)
  })

  it('accepts coolingCoil specification', () => {
    const result = AhuNode.parse({
      ...baseEquipmentData,
      coolingCoil: {
        rows: 6,
        fpi: 14,
        enteringWaterTemp: 7,
        leavingWaterTemp: 12,
        waterFlowRate: 150,
      },
    })
    expect(result.coolingCoil!.rows).toBe(6)
    expect(result.coolingCoil!.waterFlowRate).toBe(150)
  })

  it('accepts heatingCoil specification', () => {
    const result = AhuNode.parse({
      ...baseEquipmentData,
      heatingCoil: {
        type: 'hot_water',
        capacity: 20,
        waterFlowRate: 50,
      },
    })
    expect(result.heatingCoil!.type).toBe('hot_water')
  })

  it('accepts humidifier and heatRecovery', () => {
    const result = AhuNode.parse({
      ...baseEquipmentData,
      humidifier: { type: 'steam', capacity: 10 },
      heatRecovery: { type: 'total_heat', efficiency: 70 },
    })
    expect(result.humidifier!.type).toBe('steam')
    expect(result.heatRecovery!.efficiency).toBe(70)
  })

  it('accepts voltage and phase', () => {
    const result = AhuNode.parse({
      ...baseEquipmentData,
      voltage: '200V',
      phase: 'three',
      filterGrade: 'HEPA',
    })
    expect(result.voltage).toBe('200V')
    expect(result.phase).toBe('three')
    expect(result.filterGrade).toBe('HEPA')
  })
})

// ========================================
// PacNode
// ========================================
describe('PacNode', () => {
  it('parses with pac_ prefixed ID and type "pac"', () => {
    const result = PacNode.parse({
      ...baseEquipmentData,
      subType: 'ceiling_cassette',
    })
    expect(result.id).toMatch(/^pac_[a-z0-9]+$/)
    expect(result.type).toBe('pac')
    expect(result.subType).toBe('ceiling_cassette')
    expect(result.connectedIndoorUnitIds).toEqual([])
  })

  it.each([
    'ceiling_cassette',
    'ceiling_duct',
    'wall_mount',
    'floor_standing',
    'outdoor_unit',
  ])('accepts subType "%s"', (subType) => {
    const result = PacNode.parse({ ...baseEquipmentData, subType })
    expect(result.subType).toBe(subType)
  })

  it('accepts pac-specific specs', () => {
    const result = PacNode.parse({
      ...baseEquipmentData,
      subType: 'outdoor_unit',
      coolingCapacity: 14,
      cop: 3.5,
      refrigerantType: 'R32',
      ratedPower: 4.5,
      connectedIndoorUnitIds: ['pac_indoor1', 'pac_indoor2'],
    })
    expect(result.cop).toBe(3.5)
    expect(result.refrigerantType).toBe('R32')
    expect(result.connectedIndoorUnitIds).toHaveLength(2)
  })
})

// ========================================
// DiffuserNode
// ========================================
describe('DiffuserNode', () => {
  it('parses with diff_ prefixed ID and type "diffuser"', () => {
    const result = DiffuserNode.parse({
      ...baseEquipmentData,
      subType: 'anemo',
    })
    expect(result.id).toMatch(/^diff_[a-z0-9]+$/)
    expect(result.type).toBe('diffuser')
    expect(result.ceilingMounted).toBe(true)
  })

  it.each([
    'anemo',
    'line',
    'universal',
    'slot',
    'ceiling_return',
    'floor_supply',
    'wall_grille',
    'weather_louver',
  ])('accepts subType "%s"', (subType) => {
    const result = DiffuserNode.parse({ ...baseEquipmentData, subType })
    expect(result.subType).toBe(subType)
  })

  it('accepts diffuser-specific specs', () => {
    const result = DiffuserNode.parse({
      ...baseEquipmentData,
      subType: 'anemo',
      airflowRate: 800,
      effectiveArea: 0.04,
      neckSize: 'Φ200',
      throwDistance: 3.5,
      noiseLevel: 35,
      ceilingMounted: true,
      hostDuctId: 'duct_abc',
    })
    expect(result.airflowRate).toBe(800)
    expect(result.neckSize).toBe('Φ200')
    expect(result.hostDuctId).toBe('duct_abc')
  })
})

// ========================================
// 全13種 ID形式・type 検証
// ========================================
describe('All 13 equipment types - ID prefix and type', () => {
  const cases: Array<{ name: string; schema: any; prefix: string; type: string; extra?: Record<string, unknown> }> = [
    { name: 'AhuNode', schema: AhuNode, prefix: 'ahu_', type: 'ahu' },
    { name: 'PacNode', schema: PacNode, prefix: 'pac_', type: 'pac', extra: { subType: 'ceiling_cassette' } },
    { name: 'DiffuserNode', schema: DiffuserNode, prefix: 'diff_', type: 'diffuser', extra: { subType: 'anemo' } },
    { name: 'FcuNode', schema: FcuNode, prefix: 'fcu_', type: 'fcu' },
    { name: 'VrfOutdoorNode', schema: VrfOutdoorNode, prefix: 'vrfo_', type: 'vrf_outdoor' },
    { name: 'VrfIndoorNode', schema: VrfIndoorNode, prefix: 'vrfi_', type: 'vrf_indoor' },
    { name: 'DamperNode', schema: DamperNode, prefix: 'damp_', type: 'damper' },
    { name: 'FanNode', schema: FanNode, prefix: 'fan_', type: 'fan' },
    { name: 'PumpNode', schema: PumpNode, prefix: 'pump_', type: 'pump' },
    { name: 'ChillerNode', schema: ChillerNode, prefix: 'chlr_', type: 'chiller' },
    { name: 'BoilerNode', schema: BoilerNode, prefix: 'blr_', type: 'boiler' },
    { name: 'CoolingTowerNode', schema: CoolingTowerNode, prefix: 'ct_', type: 'cooling_tower' },
    { name: 'ValveNode', schema: ValveNode, prefix: 'vlv_', type: 'valve' },
  ]

  for (const { name, schema, prefix, type, extra } of cases) {
    it(`${name}: generates ${prefix}xxx ID and type="${type}"`, () => {
      const result = schema.parse({ ...baseEquipmentData, ...extra })
      expect(result.id).toMatch(new RegExp(`^${prefix}[a-z0-9]+$`))
      expect(result.type).toBe(type)
    })
  }

  it('all equipment types default ports to empty array', () => {
    for (const { schema, extra } of cases) {
      const result = schema.parse({ ...baseEquipmentData, ...extra })
      expect(result.ports).toEqual([])
    }
  })
})
