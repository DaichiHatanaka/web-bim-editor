import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const CoolingTowerNode = HvacEquipmentBase.extend({
  id: objectId('ct'),
  type: nodeType('cooling_tower'),
  children: z.array(z.string()).default([]),
})
export type CoolingTowerNode = z.infer<typeof CoolingTowerNode>
