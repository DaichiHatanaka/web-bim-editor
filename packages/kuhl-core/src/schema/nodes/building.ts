import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const BuildingNode = BaseNode.extend({
  id: objectId('building'),
  type: nodeType('building'),
  buildingName: z.string(),
  children: z.array(z.string()).default([]),
})

export type BuildingNode = z.infer<typeof BuildingNode>
