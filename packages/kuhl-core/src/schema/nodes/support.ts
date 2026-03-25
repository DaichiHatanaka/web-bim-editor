import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const SupportNode = BaseNode.extend({
  id: objectId('sup'),
  type: nodeType('support'),
  children: z.array(z.string()).default([]),
})
export type SupportNode = z.infer<typeof SupportNode>
