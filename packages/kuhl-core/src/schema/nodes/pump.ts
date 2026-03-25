import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const PumpNode = HvacEquipmentBase.extend({
  id: objectId('pump'),
  type: nodeType('pump'),
  children: z.array(z.string()).default([]),
})
export type PumpNode = z.infer<typeof PumpNode>
