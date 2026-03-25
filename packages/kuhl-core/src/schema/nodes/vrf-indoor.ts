import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const VrfIndoorNode = HvacEquipmentBase.extend({
  id: objectId('vrfi'),
  type: nodeType('vrf_indoor'),
  children: z.array(z.string()).default([]),
})
export type VrfIndoorNode = z.infer<typeof VrfIndoorNode>
