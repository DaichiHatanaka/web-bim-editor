import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const FanNode = HvacEquipmentBase.extend({
  id: objectId('fan'),
  type: nodeType('fan'),
  children: z.array(z.string()).default([]),
})
export type FanNode = z.infer<typeof FanNode>
