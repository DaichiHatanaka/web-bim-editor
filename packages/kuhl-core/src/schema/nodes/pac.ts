import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const PacSubType = z.enum([
  'ceiling_cassette',
  'ceiling_duct',
  'wall_mount',
  'floor_standing',
  'outdoor_unit',
])
export type PacSubType = z.infer<typeof PacSubType>

export const PacNode = HvacEquipmentBase.extend({
  id: objectId('pac'),
  type: nodeType('pac'),
  children: z.array(z.string()).default([]),

  subType: PacSubType,

  coolingCapacity: z.number().optional(),
  heatingCapacity: z.number().optional(),
  cop: z.number().optional(),
  airflowRate: z.number().optional(),
  refrigerantType: z.string().optional(),
  refrigerantCharge: z.number().optional(),
  ratedPower: z.number().optional(),
  ratedCurrent: z.number().optional(),
  voltage: z.enum(['200V', '400V']).optional(),
  phase: z.enum(['single', 'three']).optional(),
  vrfSystemId: z.string().optional(),
  connectedIndoorUnitIds: z.array(z.string()).default([]),
})
export type PacNode = z.infer<typeof PacNode>
