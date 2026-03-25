import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const DuctFittingNode = BaseNode.extend({
  id: objectId('dfit'),
  type: nodeType('duct_fitting'),
  children: z.array(z.string()).default([]),
})
export type DuctFittingNode = z.infer<typeof DuctFittingNode>
