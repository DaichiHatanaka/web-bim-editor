import { afterEach, describe, expect, it } from 'vitest'
import { sceneRegistry } from '../../hooks/scene-registry/scene-registry'

describe('sceneRegistry', () => {
  afterEach(() => {
    sceneRegistry.clear()
  })

  describe('nodes Map', () => {
    it('stores and retrieves objects by ID', () => {
      const obj = { type: 'Object3D' }
      sceneRegistry.nodes.set('ahu_001', obj)
      expect(sceneRegistry.nodes.get('ahu_001')).toBe(obj)
    })

    it('deletes objects by ID', () => {
      sceneRegistry.nodes.set('pac_001', { type: 'Object3D' })
      sceneRegistry.nodes.delete('pac_001')
      expect(sceneRegistry.nodes.has('pac_001')).toBe(false)
    })
  })

  describe('byType Sets', () => {
    it('has sets for all 24 node types', () => {
      const types = [
        'plant', 'building', 'level', 'hvac_zone',
        'ahu', 'pac', 'fcu', 'vrf_outdoor', 'vrf_indoor',
        'diffuser', 'damper', 'fan', 'pump', 'chiller',
        'boiler', 'cooling_tower', 'valve',
        'duct_segment', 'duct_fitting', 'pipe_segment', 'pipe_fitting',
        'system', 'support', 'architecture_ref',
      ]
      for (const type of types) {
        expect(sceneRegistry.byType[type as keyof typeof sceneRegistry.byType]).toBeInstanceOf(Set)
      }
      expect(Object.keys(sceneRegistry.byType)).toHaveLength(24)
    })

    it('adds and checks membership', () => {
      sceneRegistry.byType.ahu.add('ahu_001')
      expect(sceneRegistry.byType.ahu.has('ahu_001')).toBe(true)
      expect(sceneRegistry.byType.ahu.has('ahu_002')).toBe(false)
    })

    it('removes entries', () => {
      sceneRegistry.byType.duct_segment.add('duct_001')
      sceneRegistry.byType.duct_segment.delete('duct_001')
      expect(sceneRegistry.byType.duct_segment.has('duct_001')).toBe(false)
    })
  })

  describe('clear', () => {
    it('clears nodes map and all byType sets', () => {
      sceneRegistry.nodes.set('ahu_001', {})
      sceneRegistry.byType.ahu.add('ahu_001')
      sceneRegistry.byType.level.add('level_001')

      sceneRegistry.clear()

      expect(sceneRegistry.nodes.size).toBe(0)
      expect(sceneRegistry.byType.ahu.size).toBe(0)
      expect(sceneRegistry.byType.level.size).toBe(0)
    })
  })
})
