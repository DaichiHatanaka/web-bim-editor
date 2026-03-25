import type { AnyNodeType } from '../../schema/types'

// All HVAC node types for categorized lookup
type RegistryByType = Record<AnyNodeType, Set<string>>

function createByType(): RegistryByType {
  const types: AnyNodeType[] = [
    'plant',
    'building',
    'level',
    'hvac_zone',
    'ahu',
    'pac',
    'fcu',
    'vrf_outdoor',
    'vrf_indoor',
    'diffuser',
    'damper',
    'fan',
    'pump',
    'chiller',
    'boiler',
    'cooling_tower',
    'valve',
    'duct_segment',
    'duct_fitting',
    'pipe_segment',
    'pipe_fitting',
    'system',
    'support',
    'architecture_ref',
  ]
  const result = {} as RegistryByType
  for (const t of types) {
    result[t] = new Set<string>()
  }
  return result
}

export const sceneRegistry = {
  // Master lookup: ID -> Object3D (typed as unknown in core, cast in viewer)
  nodes: new Map<string, unknown>(),

  // Categorized lookups: Type -> Set of IDs
  byType: createByType(),

  /** Remove all entries. Call when unloading a scene. */
  clear() {
    this.nodes.clear()
    for (const set of Object.values(this.byType)) {
      (set as Set<string>).clear()
    }
  },
}
