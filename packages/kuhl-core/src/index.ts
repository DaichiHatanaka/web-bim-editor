// Schema - Base
export {
  BaseNode,
  type BaseNode as BaseNodeType,
  CameraSchema,
  type Camera,
  generateId,
  nodeType,
  objectId,
} from './schema/base'

// Schema - Nodes (re-export all)
export * from './schema/nodes'

// Schema - Types (AnyNode union)
export { AnyNode, type AnyNode as AnyNodeInferred, type AnyNodeId, type AnyNodeType } from './schema/types'

// Store
export { default as useScene, clearSceneHistory, type SceneState } from './store/use-scene'

// Systems
export {
  LOAD_INTENSITY_TABLE,
  ORIENTATION_FACTORS,
  calculateZoneLoad,
  getGlazingFactor,
  getOrientationFactor,
  type ZoneLoadCalcResult,
  type ZoneLoadInput,
} from './systems/zone/load-calc'
export { LoadCalcSystem, processLoadCalc } from './systems/zone/load-calc-system'

// Events
export {
  emitter,
  eventKey,
  eventSuffixes,
  type EventSuffix,
  type GridEvent,
  type KuhlEvents,
  type NodeEvent,
  type CameraControlEvent,
} from './events/bus'

// Hooks
export { sceneRegistry } from './hooks/scene-registry/scene-registry'

// IFC Import
export {
  createArchitectureRefNodeData,
  filterTargetGeometries,
  flatTransformationToMatrix4,
  IFC_TYPE_COLOR_MAP,
  initIfcApi,
  isValidIfcBuffer,
  parseIfcFile,
  TARGET_IFC_TYPES,
  type IfcParseResult,
  type ParsedGeometry,
  type ParsedStorey,
} from './systems/ifc/ifc-import'
