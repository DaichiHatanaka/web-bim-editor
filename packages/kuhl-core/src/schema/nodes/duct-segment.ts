import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

const Vector3Schema = z.tuple([z.number(), z.number(), z.number()])

export const DuctMedium = z.enum(['supply', 'return', 'outside_air', 'exhaust'])
export type DuctMedium = z.infer<typeof DuctMedium>

export const DuctMaterial = z.enum([
  'galvanized',
  'stainless',
  'glass_wool_duct',
  'flexible',
  'spiral',
])
export type DuctMaterial = z.infer<typeof DuctMaterial>

export const DuctShape = z.enum(['rectangular', 'circular'])
export type DuctShape = z.infer<typeof DuctShape>

export const DuctInsulation = z.object({
  type: z.enum(['glass_wool', 'rock_wool', 'polystyrene', 'none']),
  thickness: z.number().optional(),
})

export const DuctCalcResult = z.object({
  velocity: z.number().optional(),
  pressureLoss: z.number().optional(),
  pressureLossPerM: z.number().optional(),
  equivalentDiameter: z.number().optional(),
  airflowRate: z.number().optional(),
  length: z.number().optional(),
})
export type DuctCalcResult = z.infer<typeof DuctCalcResult>

export const DuctSegmentNode = BaseNode.extend({
  id: objectId('duct'),
  type: nodeType('duct_segment'),

  start: Vector3Schema,
  end: Vector3Schema,

  shape: DuctShape,
  width: z.number().optional(),
  height: z.number().optional(),
  diameter: z.number().optional(),

  material: DuctMaterial,
  plateThickness: z.number().optional(),
  insulation: DuctInsulation,

  medium: DuctMedium,

  startPortId: z.string().nullable().default(null),
  endPortId: z.string().nullable().default(null),
  systemId: z.string().optional(),

  calcResult: DuctCalcResult.optional(),
})
export type DuctSegmentNode = z.infer<typeof DuctSegmentNode>
