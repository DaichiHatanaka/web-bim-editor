import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const ChillerNode = HvacEquipmentBase.extend({
  id: objectId('chlr'),
  type: nodeType('chiller'),
  children: z.array(z.string()).default([]),
})
export type ChillerNode = z.infer<typeof ChillerNode>
