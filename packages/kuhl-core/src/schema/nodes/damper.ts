import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const DamperNode = HvacEquipmentBase.extend({
  id: objectId('damp'),
  type: nodeType('damper'),
  children: z.array(z.string()).default([]),
})
export type DamperNode = z.infer<typeof DamperNode>
