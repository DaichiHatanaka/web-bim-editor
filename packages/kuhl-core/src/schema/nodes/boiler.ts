import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const BoilerNode = HvacEquipmentBase.extend({
  id: objectId('blr'),
  type: nodeType('boiler'),
  children: z.array(z.string()).default([]),
})
export type BoilerNode = z.infer<typeof BoilerNode>
