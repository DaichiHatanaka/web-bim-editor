import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const VrfOutdoorNode = HvacEquipmentBase.extend({
  id: objectId('vrfo'),
  type: nodeType('vrf_outdoor'),
  children: z.array(z.string()).default([]),
})
export type VrfOutdoorNode = z.infer<typeof VrfOutdoorNode>
