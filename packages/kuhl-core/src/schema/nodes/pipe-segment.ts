import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

const Vector3Schema = z.tuple([z.number(), z.number(), z.number()])

export const PipeMedium = z.enum([
  'chilled_water',
  'hot_water',
  'condenser_water',
  'refrigerant_liquid',
  'refrigerant_gas',
  'drain',
])
export type PipeMedium = z.infer<typeof PipeMedium>

export const PipeMaterial = z.enum([
  'sgp',
  'stpg',
  'sus304',
  'sus316',
  'vp',
  'hivp',
  'copper',
  'pe',
])
export type PipeMaterial = z.infer<typeof PipeMaterial>

export const PipeInsulation = z.object({
  type: z.enum(['glass_wool', 'polystyrene', 'polyethylene', 'none']),
  thickness: z.number().optional(),
})

export const PipeCalcResult = z.object({
  velocity: z.number().optional(),
  pressureLoss: z.number().optional(),
  pressureLossPerM: z.number().optional(),
  flowRate: z.number().optional(),
  length: z.number().optional(),
})
export type PipeCalcResult = z.infer<typeof PipeCalcResult>

export const PipeSegmentNode = BaseNode.extend({
  id: objectId('pipe'),
  type: nodeType('pipe_segment'),

  start: Vector3Schema,
  end: Vector3Schema,

  nominalSize: z.string(),
  material: PipeMaterial,
  schedule: z.string().optional(),

  medium: PipeMedium,

  insulation: PipeInsulation,

  startPortId: z.string().nullable().default(null),
  endPortId: z.string().nullable().default(null),
  systemId: z.string().optional(),

  calcResult: PipeCalcResult.optional(),
})
export type PipeSegmentNode = z.infer<typeof PipeSegmentNode>
