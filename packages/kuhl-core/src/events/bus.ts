import mitt from 'mitt'
import type { AnyNode, AnyNodeType } from '../schema/types'

// Base event interfaces
export interface GridEvent {
  position: [number, number, number]
  nativeEvent: unknown
}

export interface NodeEvent<T extends AnyNode = AnyNode> {
  node: T
  position: [number, number, number]
  localPosition: [number, number, number]
  normal?: [number, number, number]
  stopPropagation: () => void
  nativeEvent: unknown
}

// Event suffixes
export const eventSuffixes = [
  'click',
  'move',
  'enter',
  'leave',
  'pointerdown',
  'pointerup',
  'context-menu',
  'double-click',
] as const

export type EventSuffix = (typeof eventSuffixes)[number]

// Generate event map for all HVAC node types
type NodeEvents<T extends string, E> = {
  [K in `${T}:${EventSuffix}`]: E
}

type GridEvents = {
  [K in `grid:${EventSuffix}`]: GridEvent
}

export interface CameraControlEvent {
  nodeId: AnyNode['id']
}

type CameraControlEvents = {
  'camera-controls:view': CameraControlEvent
  'camera-controls:capture': CameraControlEvent
  'camera-controls:top-view': undefined
  'camera-controls:orbit-cw': undefined
  'camera-controls:orbit-ccw': undefined
}

type ToolEvents = {
  'tool:cancel': undefined
}

// KuhlEvents: all HVAC node types + grid + camera + tool events
export type KuhlEvents = GridEvents &
  NodeEvents<'plant', NodeEvent> &
  NodeEvents<'building', NodeEvent> &
  NodeEvents<'level', NodeEvent> &
  NodeEvents<'hvac_zone', NodeEvent> &
  NodeEvents<'ahu', NodeEvent> &
  NodeEvents<'pac', NodeEvent> &
  NodeEvents<'fcu', NodeEvent> &
  NodeEvents<'vrf_outdoor', NodeEvent> &
  NodeEvents<'vrf_indoor', NodeEvent> &
  NodeEvents<'diffuser', NodeEvent> &
  NodeEvents<'damper', NodeEvent> &
  NodeEvents<'fan', NodeEvent> &
  NodeEvents<'pump', NodeEvent> &
  NodeEvents<'chiller', NodeEvent> &
  NodeEvents<'boiler', NodeEvent> &
  NodeEvents<'cooling_tower', NodeEvent> &
  NodeEvents<'valve', NodeEvent> &
  NodeEvents<'duct_segment', NodeEvent> &
  NodeEvents<'duct_fitting', NodeEvent> &
  NodeEvents<'pipe_segment', NodeEvent> &
  NodeEvents<'pipe_fitting', NodeEvent> &
  NodeEvents<'system', NodeEvent> &
  NodeEvents<'support', NodeEvent> &
  NodeEvents<'architecture_ref', NodeEvent> &
  CameraControlEvents &
  ToolEvents

export const emitter = mitt<KuhlEvents>()

/** Helper to build event key from node type and suffix */
export function eventKey(nodeType: AnyNodeType, suffix: EventSuffix): string {
  return `${nodeType}:${suffix}`
}
