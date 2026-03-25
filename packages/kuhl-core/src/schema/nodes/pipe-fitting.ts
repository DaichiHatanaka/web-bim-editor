import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const PipeFittingNode = BaseNode.extend({
  id: objectId('pfit'),
  type: nodeType('pipe_fitting'),
  children: z.array(z.string()).default([]),
})
export type PipeFittingNode = z.infer<typeof PipeFittingNode>
