import { describe, expect, it } from 'vitest'
import { HvacZoneNode } from '@kuhl/core'

describe('ZoneDrawTool - HvacZoneNode.parse()', () => {
  describe('TC-007: HvacZoneNode.parse() でノード生成確認', () => {
    it('必須フィールドとデフォルト値が正しく設定される', () => {
      const zone = HvacZoneNode.parse({
        zoneName: 'Test Zone',
        usage: 'office',
        floorArea: 50,
        boundary: [[0, 0], [10, 0], [10, 5], [0, 5]],
      })

      expect(zone.id).toMatch(/^zone_/)
      expect(zone.type).toBe('hvac_zone')
      expect(zone.zoneName).toBe('Test Zone')
      expect(zone.usage).toBe('office')
      expect(zone.floorArea).toBe(50)
      expect(zone.boundary).toEqual([[0, 0], [10, 0], [10, 5], [0, 5]])
      expect(zone.designConditions.summerDryBulb).toBe(26)
    })
  })
})
