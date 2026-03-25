import { describe, expect, it } from 'vitest'
import { BuildingNode, LevelNode, PlantNode } from '../../../schema/nodes'

describe('PlantNode', () => {
  it('parses valid data and generates plant_ prefixed ID', () => {
    const result = PlantNode.parse({
      plantName: 'Test Plant',
    })
    expect(result.id).toMatch(/^plant_[a-z0-9]+$/)
    expect(result.type).toBe('plant')
    expect(result.plantName).toBe('Test Plant')
    expect(result.children).toEqual([])
    expect(result.object).toBe('node')
  })

  it('accepts optional address', () => {
    const result = PlantNode.parse({
      plantName: 'Plant A',
      address: 'Tokyo, Japan',
    })
    expect(result.address).toBe('Tokyo, Japan')
  })

  it('accepts provided ID if valid', () => {
    const result = PlantNode.parse({
      id: 'plant_custom123',
      plantName: 'Custom Plant',
    })
    expect(result.id).toBe('plant_custom123')
  })

  it('rejects invalid type', () => {
    expect(() =>
      PlantNode.parse({
        id: 'plant_abc',
        type: 'building',
        plantName: 'Bad',
      }),
    ).toThrow()
  })
})

describe('BuildingNode', () => {
  it('parses valid data and generates building_ prefixed ID', () => {
    const result = BuildingNode.parse({
      buildingName: 'Building A',
      parentId: 'plant_abc123',
    })
    expect(result.id).toMatch(/^building_[a-z0-9]+$/)
    expect(result.type).toBe('building')
    expect(result.buildingName).toBe('Building A')
    expect(result.children).toEqual([])
    expect(result.parentId).toBe('plant_abc123')
  })

  it('rejects invalid type', () => {
    expect(() =>
      BuildingNode.parse({
        id: 'building_abc',
        type: 'level',
        buildingName: 'Bad',
      }),
    ).toThrow()
  })
})

describe('LevelNode', () => {
  it('parses valid data with numeric fields', () => {
    const result = LevelNode.parse({
      floorHeight: 3.2,
      ceilingHeight: 2.7,
      elevation: 3.5,
      parentId: 'building_abc123',
    })
    expect(result.id).toMatch(/^level_[a-z0-9]+$/)
    expect(result.type).toBe('level')
    expect(result.floorHeight).toBe(3.2)
    expect(result.ceilingHeight).toBe(2.7)
    expect(result.elevation).toBe(3.5)
    expect(result.children).toEqual([])
  })

  it('rejects missing required numeric fields', () => {
    expect(() =>
      LevelNode.parse({
        parentId: 'building_abc',
      }),
    ).toThrow()
  })

  it('rejects non-numeric floorHeight', () => {
    expect(() =>
      LevelNode.parse({
        floorHeight: 'bad',
        ceilingHeight: 2.7,
        elevation: 0,
      }),
    ).toThrow()
  })
})
