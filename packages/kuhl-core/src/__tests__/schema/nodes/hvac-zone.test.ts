import { describe, expect, it } from 'vitest'
import {
  DesignConditions,
  HvacType,
  HvacZoneNode,
  LoadCalcResult,
  ZoneUsage,
} from '../../../schema/nodes/hvac-zone'

describe('ZoneUsage', () => {
  it.each([
    'office',
    'meeting',
    'server_room',
    'lobby',
    'corridor',
    'toilet',
    'kitchen',
    'warehouse',
    'mechanical_room',
    'electrical_room',
    'other',
  ])('accepts "%s"', (value) => {
    expect(ZoneUsage.parse(value)).toBe(value)
  })

  it('rejects invalid usage', () => {
    expect(() => ZoneUsage.parse('invalid_value')).toThrow()
  })
})

describe('HvacType', () => {
  it.each([
    'single_duct',
    'dual_duct',
    'fcu_oa',
    'vrf',
    'pac',
    'radiant',
    'displacement',
    'none',
  ])('accepts "%s"', (value) => {
    expect(HvacType.parse(value)).toBe(value)
  })

  it('rejects invalid hvac type', () => {
    expect(() => HvacType.parse('bad')).toThrow()
  })
})

describe('DesignConditions', () => {
  it('parses with default values', () => {
    const result = DesignConditions.parse({})
    expect(result.summerDryBulb).toBe(26)
    expect(result.summerHumidity).toBe(50)
    expect(result.winterDryBulb).toBe(22)
    expect(result.winterHumidity).toBe(40)
  })

  it('accepts optional ventilation rates', () => {
    const result = DesignConditions.parse({
      ventilationRate: 30,
      freshAirRate: 600,
    })
    expect(result.ventilationRate).toBe(30)
    expect(result.freshAirRate).toBe(600)
  })
})

describe('LoadCalcResult', () => {
  it('parses with all optional fields', () => {
    const result = LoadCalcResult.parse({
      coolingLoad: 50,
      heatingLoad: 30,
      latentLoad: 10,
      sensibleLoad: 40,
      requiredAirflow: 5000,
    })
    expect(result.coolingLoad).toBe(50)
    expect(result.requiredAirflow).toBe(5000)
  })

  it('parses empty object (all optional)', () => {
    const result = LoadCalcResult.parse({})
    expect(result.coolingLoad).toBeUndefined()
  })
})

describe('HvacZoneNode', () => {
  it('parses valid zone data with zone_ prefixed ID', () => {
    const result = HvacZoneNode.parse({
      zoneName: 'Office Zone A',
      usage: 'office',
      floorArea: 100,
    })
    expect(result.id).toMatch(/^zone_[a-z0-9]+$/)
    expect(result.type).toBe('hvac_zone')
    expect(result.zoneName).toBe('Office Zone A')
    expect(result.usage).toBe('office')
    expect(result.floorArea).toBe(100)
    expect(result.ceilingHeight).toBe(2.7)
    expect(result.children).toEqual([])
    expect(result.designConditions.summerDryBulb).toBe(26)
  })

  it('accepts boundary polygon', () => {
    const result = HvacZoneNode.parse({
      zoneName: 'Zone B',
      usage: 'meeting',
      floorArea: 50,
      boundary: [
        [0, 0],
        [10, 0],
        [10, 5],
        [0, 5],
      ],
    })
    expect(result.boundary).toHaveLength(4)
    expect(result.boundary![0]).toEqual([0, 0])
  })

  it('loadResult is optional', () => {
    const result = HvacZoneNode.parse({
      zoneName: 'Zone C',
      usage: 'corridor',
      floorArea: 30,
    })
    expect(result.loadResult).toBeUndefined()
  })

  it('accepts loadResult when provided', () => {
    const result = HvacZoneNode.parse({
      zoneName: 'Zone D',
      usage: 'server_room',
      floorArea: 200,
      loadResult: { coolingLoad: 100, heatingLoad: 20 },
    })
    expect(result.loadResult!.coolingLoad).toBe(100)
  })

  it('accepts optional occupancy and density fields', () => {
    const result = HvacZoneNode.parse({
      zoneName: 'Zone E',
      usage: 'office',
      floorArea: 150,
      occupancy: 20,
      lightingDensity: 12,
      equipmentDensity: 25,
    })
    expect(result.occupancy).toBe(20)
    expect(result.lightingDensity).toBe(12)
    expect(result.equipmentDensity).toBe(25)
  })

  it('rejects invalid usage', () => {
    expect(() =>
      HvacZoneNode.parse({
        zoneName: 'Bad',
        usage: 'invalid',
        floorArea: 100,
      }),
    ).toThrow()
  })
})
