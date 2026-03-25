import { z } from 'zod'
import { BaseNode } from '../base'

const Vector3Schema = z.tuple([z.number(), z.number(), z.number()])

export const PortMedium = z.enum([
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
])
export type PortMedium = z.infer<typeof PortMedium>

export const EquipmentStatus = z.enum(['planned', 'existing', 'demolished'])
export type EquipmentStatus = z.infer<typeof EquipmentStatus>

export const LodLevel = z.enum(['100', '200', '300'])
export type LodLevel = z.infer<typeof LodLevel>

export const PortDef = z.object({
  id: z.string(),
  name: z.string(),
  medium: PortMedium,
  direction: z.enum(['in', 'out']),
  size: z.string().optional(),
  position: Vector3Schema,
  connectedTo: z.string().nullable(),
})
export type PortDef = z.infer<typeof PortDef>

export const HvacEquipmentBase = BaseNode.extend({
  position: Vector3Schema,
  rotation: Vector3Schema,
  dimensions: Vector3Schema,

  tag: z.string(),
  equipmentName: z.string(),

  ports: z.array(PortDef).default([]),

  lod: LodLevel,
  modelSrc: z.string().optional(),

  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),

  systemId: z.string().optional(),
  definitionId: z.string().optional(),

  status: EquipmentStatus,
})
export type HvacEquipmentBase = z.infer<typeof HvacEquipmentBase>
