import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const DiffuserSubType = z.enum([
  'anemo',
  'line',
  'universal',
  'slot',
  'ceiling_return',
  'floor_supply',
  'wall_grille',
  'weather_louver',
])
export type DiffuserSubType = z.infer<typeof DiffuserSubType>

export const DiffuserNode = HvacEquipmentBase.extend({
  id: objectId('diff'),
  type: nodeType('diffuser'),

  subType: DiffuserSubType,

  airflowRate: z.number().optional(),
  effectiveArea: z.number().optional(),
  neckSize: z.string().optional(),
  throwDistance: z.number().optional(),
  noiseLevel: z.number().optional(),
  ceilingMounted: z.boolean().default(true),
  hostDuctId: z.string().optional(),
})
export type DiffuserNode = z.infer<typeof DiffuserNode>
