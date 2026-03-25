import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const SystemType = z.enum([
  'chilled_water',
  'hot_water',
  'condenser_water',
  'refrigerant',
  'supply_air',
  'return_air',
  'exhaust_air',
  'outside_air',
])
export type SystemType = z.infer<typeof SystemType>

export const SystemNode = BaseNode.extend({
  id: objectId('sys'),
  type: nodeType('system'),

  systemName: z.string(),
  systemType: SystemType,
  color: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
})
export type SystemNode = z.infer<typeof SystemNode>
