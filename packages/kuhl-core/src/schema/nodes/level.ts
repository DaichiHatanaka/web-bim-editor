import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const LevelNode = BaseNode.extend({
  id: objectId('level'),
  type: nodeType('level'),
  floorHeight: z.number(),
  ceilingHeight: z.number(),
  elevation: z.number(),
  children: z.array(z.string()).default([]),
})

export type LevelNode = z.infer<typeof LevelNode>
