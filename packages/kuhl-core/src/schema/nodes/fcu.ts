import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const FcuNode = HvacEquipmentBase.extend({
  id: objectId('fcu'),
  type: nodeType('fcu'),
  children: z.array(z.string()).default([]),
})
export type FcuNode = z.infer<typeof FcuNode>
