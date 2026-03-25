import { describe, expect, it } from 'vitest'
import { AnyNode } from '../../schema/types'
import { DuctSegmentNode } from '../../schema/nodes/duct-segment'
import { PipeSegmentNode } from '../../schema/nodes/pipe-segment'
import { DuctFittingNode } from '../../schema/nodes/duct-fitting'
import { PipeFittingNode } from '../../schema/nodes/pipe-fitting'
import { SystemNode } from '../../schema/nodes/system'
import { SupportNode } from '../../schema/nodes/support'
import { ArchitectureRefNode } from '../../schema/nodes/architecture-ref'

const baseEquipmentData = {
  tag: 'TEST-001',
  equipmentName: 'テスト機器',
  position: [0, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  dimensions: [1, 1, 1] as [number, number, number],
  lod: '100' as const,
  status: 'planned' as const,
}

describe('DuctSegmentNode', () => {
  it('parses valid duct segment', () => {
    const result = DuctSegmentNode.parse({
      start: [0, 0, 3],
      end: [5, 0, 3],
      shape: 'rectangular',
      width: 400,
      height: 300,
      material: 'galvanized',
      insulation: { type: 'glass_wool', thickness: 25 },
      medium: 'supply',
    })
    expect(result.id).toMatch(/^duct_[a-z0-9]+$/)
    expect(result.type).toBe('duct_segment')
    expect(result.shape).toBe('rectangular')
    expect(result.width).toBe(400)
    expect(result.medium).toBe('supply')
    expect(result.startPortId).toBeNull()
  })
})

describe('PipeSegmentNode', () => {
  it('parses valid pipe segment', () => {
    const result = PipeSegmentNode.parse({
      start: [0, 0, 0],
      end: [3, 0, 0],
      nominalSize: '50A',
      material: 'sgp',
      medium: 'chilled_water',
      insulation: { type: 'polystyrene', thickness: 20 },
    })
    expect(result.id).toMatch(/^pipe_[a-z0-9]+$/)
    expect(result.type).toBe('pipe_segment')
    expect(result.nominalSize).toBe('50A')
    expect(result.material).toBe('sgp')
  })
})

describe('DuctFittingNode', () => {
  it('parses with dfit_ prefix', () => {
    const result = DuctFittingNode.parse({})
    expect(result.id).toMatch(/^dfit_[a-z0-9]+$/)
    expect(result.type).toBe('duct_fitting')
  })
})

describe('PipeFittingNode', () => {
  it('parses with pfit_ prefix', () => {
    const result = PipeFittingNode.parse({})
    expect(result.id).toMatch(/^pfit_[a-z0-9]+$/)
    expect(result.type).toBe('pipe_fitting')
  })
})

describe('SystemNode', () => {
  it('parses valid system', () => {
    const result = SystemNode.parse({
      systemName: '給気系統A',
      systemType: 'supply_air',
    })
    expect(result.id).toMatch(/^sys_[a-z0-9]+$/)
    expect(result.type).toBe('system')
    expect(result.systemName).toBe('給気系統A')
    expect(result.memberIds).toEqual([])
  })

  it('accepts color and memberIds', () => {
    const result = SystemNode.parse({
      systemName: '冷水1次系統',
      systemType: 'chilled_water',
      color: '#0088FF',
      memberIds: ['pipe_abc', 'pump_def'],
    })
    expect(result.color).toBe('#0088FF')
    expect(result.memberIds).toHaveLength(2)
  })
})

describe('SupportNode', () => {
  it('parses with sup_ prefix', () => {
    const result = SupportNode.parse({})
    expect(result.id).toMatch(/^sup_[a-z0-9]+$/)
    expect(result.type).toBe('support')
  })
})

describe('ArchitectureRefNode', () => {
  it('parses valid architecture ref', () => {
    const result = ArchitectureRefNode.parse({
      ifcFilePath: '/uploads/building.ifc',
    })
    expect(result.id).toMatch(/^arch_[a-z0-9]+$/)
    expect(result.type).toBe('architecture_ref')
    expect(result.ifcFilePath).toBe('/uploads/building.ifc')
  })

  it('accepts optional level mapping', () => {
    const result = ArchitectureRefNode.parse({
      ifcFilePath: 'building.ifc',
      ifcModelId: 'model_001',
      levelMapping: { 'IFC_1F': 'level_abc', 'IFC_2F': 'level_def' },
    })
    expect(result.levelMapping).toEqual({ 'IFC_1F': 'level_abc', 'IFC_2F': 'level_def' })
  })
})

describe('AnyNode discriminated union', () => {
  it('parses AhuNode via AnyNode', () => {
    const result = AnyNode.parse({
      ...baseEquipmentData,
      type: 'ahu',
      id: 'ahu_test123',
    })
    expect(result.type).toBe('ahu')
  })

  it('parses PlantNode via AnyNode', () => {
    const result = AnyNode.parse({
      type: 'plant',
      id: 'plant_test123',
      plantName: 'Test',
    })
    expect(result.type).toBe('plant')
  })

  it('parses DuctSegmentNode via AnyNode', () => {
    const result = AnyNode.parse({
      type: 'duct_segment',
      id: 'duct_test123',
      start: [0, 0, 0],
      end: [5, 0, 0],
      shape: 'rectangular',
      material: 'galvanized',
      insulation: { type: 'none' },
      medium: 'supply',
    })
    expect(result.type).toBe('duct_segment')
  })

  it('parses SystemNode via AnyNode', () => {
    const result = AnyNode.parse({
      type: 'system',
      id: 'sys_test123',
      systemName: 'Test System',
      systemType: 'supply_air',
    })
    expect(result.type).toBe('system')
  })

  const allTypes = [
    { type: 'plant', data: { id: 'plant_x', plantName: 'P' } },
    { type: 'building', data: { id: 'building_x', buildingName: 'B' } },
    { type: 'level', data: { id: 'level_x', floorHeight: 3, ceilingHeight: 2.7, elevation: 0 } },
    { type: 'hvac_zone', data: { id: 'zone_x', zoneName: 'Z', usage: 'office', floorArea: 100 } },
    { type: 'ahu', data: { id: 'ahu_x', ...baseEquipmentData } },
    { type: 'pac', data: { id: 'pac_x', ...baseEquipmentData, subType: 'ceiling_cassette' } },
    { type: 'fcu', data: { id: 'fcu_x', ...baseEquipmentData } },
    { type: 'vrf_outdoor', data: { id: 'vrfo_x', ...baseEquipmentData } },
    { type: 'vrf_indoor', data: { id: 'vrfi_x', ...baseEquipmentData } },
    { type: 'diffuser', data: { id: 'diff_x', ...baseEquipmentData, subType: 'anemo' } },
    { type: 'damper', data: { id: 'damp_x', ...baseEquipmentData } },
    { type: 'fan', data: { id: 'fan_x', ...baseEquipmentData } },
    { type: 'pump', data: { id: 'pump_x', ...baseEquipmentData } },
    { type: 'chiller', data: { id: 'chlr_x', ...baseEquipmentData } },
    { type: 'boiler', data: { id: 'blr_x', ...baseEquipmentData } },
    { type: 'cooling_tower', data: { id: 'ct_x', ...baseEquipmentData } },
    { type: 'valve', data: { id: 'vlv_x', ...baseEquipmentData } },
    { type: 'duct_segment', data: { id: 'duct_x', start: [0,0,0], end: [1,0,0], shape: 'rectangular', material: 'galvanized', insulation: { type: 'none' }, medium: 'supply' } },
    { type: 'duct_fitting', data: { id: 'dfit_x' } },
    { type: 'pipe_segment', data: { id: 'pipe_x', start: [0,0,0], end: [1,0,0], nominalSize: '25A', material: 'sgp', medium: 'chilled_water', insulation: { type: 'none' } } },
    { type: 'pipe_fitting', data: { id: 'pfit_x' } },
    { type: 'system', data: { id: 'sys_x', systemName: 'S', systemType: 'supply_air' } },
    { type: 'support', data: { id: 'sup_x' } },
    { type: 'architecture_ref', data: { id: 'arch_x', ifcFilePath: 'test.ifc' } },
  ]

  it('contains all 24 node types', () => {
    expect(allTypes).toHaveLength(24)
  })

  for (const { type, data } of allTypes) {
    it(`parses type="${type}" via AnyNode`, () => {
      const result = AnyNode.parse({ type, ...data })
      expect(result.type).toBe(type)
    })
  }

  it('rejects unknown type', () => {
    expect(() =>
      AnyNode.parse({ type: 'unknown_type', id: 'xxx_123' }),
    ).toThrow()
  })
})
