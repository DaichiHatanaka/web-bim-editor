import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const PlantNode = BaseNode.extend({
  id: objectId('plant'),
  type: nodeType('plant'),
  plantName: z.string(),
  address: z.string().optional(),
  children: z.array(z.string()).default([]),
})

export type PlantNode = z.infer<typeof PlantNode>
