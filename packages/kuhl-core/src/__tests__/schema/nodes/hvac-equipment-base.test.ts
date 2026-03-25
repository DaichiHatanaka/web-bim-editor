import { describe, expect, it } from 'vitest'
import {
  EquipmentStatus,
  HvacEquipmentBase,
  LodLevel,
  PortDef,
  PortMedium,
} from '../../../schema/nodes/hvac-equipment-base'
import { nodeType, objectId } from '../../../schema/base'

describe('PortMedium', () => {
  it.each([
    'supply_air',
    'return_air',
    'outside_air',
    'exhaust_air',
    'chilled_water',
    'hot_water',
    'condenser_water',
    'refrigerant_liquid',
    'refrigerant_gas',
    'drain',
    'electric',
    'signal',
  ])('accepts "%s"', (value) => {
    expect(PortMedium.parse(value)).toBe(value)
  })

  it('rejects invalid medium', () => {
    expect(() => PortMedium.parse('steam')).toThrow()
  })
})

describe('EquipmentStatus', () => {
  it.each(['planned', 'existing', 'demolished'])('accepts "%s"', (value) => {
    expect(EquipmentStatus.parse(value)).toBe(value)
  })

  it('rejects invalid status', () => {
    expect(() => EquipmentStatus.parse('removed')).toThrow()
  })
})

describe('LodLevel', () => {
  it.each(['100', '200', '300'])('accepts "%s"', (value) => {
    expect(LodLevel.parse(value)).toBe(value)
  })

  it('rejects invalid LOD', () => {
    expect(() => LodLevel.parse('400')).toThrow()
  })
})

describe('PortDef', () => {
  it('parses valid port definition', () => {
    const result = PortDef.parse({
      id: 'port_1',
      name: '給気口',
      medium: 'supply_air',
      direction: 'out',
      position: [0, 0, 0],
      connectedTo: null,
    })
    expect(result.id).toBe('port_1')
    expect(result.medium).toBe('supply_air')
    expect(result.direction).toBe('out')
    expect(result.connectedTo).toBeNull()
  })

  it('accepts optional size', () => {
    const result = PortDef.parse({
      id: 'port_2',
      name: '冷水入口',
      medium: 'chilled_water',
      direction: 'in',
      size: '50A',
      position: [1, 0, 0.5],
      connectedTo: 'pipe_abc',
    })
    expect(result.size).toBe('50A')
    expect(result.connectedTo).toBe('pipe_abc')
  })

  it('rejects invalid direction', () => {
    expect(() =>
      PortDef.parse({
        id: 'port_3',
        name: 'Bad',
        medium: 'supply_air',
        direction: 'both',
        position: [0, 0, 0],
        connectedTo: null,
      }),
    ).toThrow()
  })
})

describe('HvacEquipmentBase', () => {
  const validEquipment = {
    tag: 'AHU-101',
    equipmentName: '空調機No.1',
    position: [5, 0, 3] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    dimensions: [2, 1.5, 1.8] as [number, number, number],
    ports: [
      {
        id: 'port_sa',
        name: '給気口',
        medium: 'supply_air' as const,
        direction: 'out' as const,
        position: [2, 0.5, 0.9] as [number, number, number],
        connectedTo: null,
      },
    ],
    lod: '100' as const,
    status: 'planned' as const,
  }

  it('parses valid equipment data (extended schema)', () => {
    // HvacEquipmentBase is meant to be extended, but we can test it with a test schema
    const TestEquipment = HvacEquipmentBase.extend({
      id: objectId('test'),
      type: nodeType('test_equip'),
    })

    const result = TestEquipment.parse(validEquipment)
    expect(result.id).toMatch(/^test_[a-z0-9]+$/)
    expect(result.tag).toBe('AHU-101')
    expect(result.equipmentName).toBe('空調機No.1')
    expect(result.position).toEqual([5, 0, 3])
    expect(result.rotation).toEqual([0, 0, 0])
    expect(result.dimensions).toEqual([2, 1.5, 1.8])
    expect(result.ports).toHaveLength(1)
    expect(result.lod).toBe('100')
    expect(result.status).toBe('planned')
  })

  it('accepts optional manufacturer and model fields', () => {
    const TestEquipment = HvacEquipmentBase.extend({
      id: objectId('test'),
      type: nodeType('test_equip'),
    })

    const result = TestEquipment.parse({
      ...validEquipment,
      manufacturer: 'Daikin',
      modelNumber: 'FXNQ32MAVE',
      systemId: 'system_001',
      definitionId: 'def_ahu_01',
    })
    expect(result.manufacturer).toBe('Daikin')
    expect(result.modelNumber).toBe('FXNQ32MAVE')
    expect(result.systemId).toBe('system_001')
    expect(result.definitionId).toBe('def_ahu_01')
  })

  it('accepts optional modelSrc', () => {
    const TestEquipment = HvacEquipmentBase.extend({
      id: objectId('test'),
      type: nodeType('test_equip'),
    })

    const result = TestEquipment.parse({
      ...validEquipment,
      modelSrc: '/models/ahu-101.glb',
    })
    expect(result.modelSrc).toBe('/models/ahu-101.glb')
  })

  it('defaults ports to empty array', () => {
    const TestEquipment = HvacEquipmentBase.extend({
      id: objectId('test'),
      type: nodeType('test_equip'),
    })

    const result = TestEquipment.parse({
      tag: 'TEST-001',
      equipmentName: 'Test',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: [1, 1, 1],
      lod: '100',
      status: 'planned',
    })
    expect(result.ports).toEqual([])
  })
})
