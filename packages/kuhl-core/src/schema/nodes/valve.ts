import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

export const ValveNode = HvacEquipmentBase.extend({
  id: objectId('vlv'),
  type: nodeType('valve'),
  children: z.array(z.string()).default([]),
})
export type ValveNode = z.infer<typeof ValveNode>
