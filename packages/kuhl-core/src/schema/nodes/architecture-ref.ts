import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const ArchitectureRefNode = BaseNode.extend({
  id: objectId('arch'),
  type: nodeType('architecture_ref'),

  ifcFilePath: z.string(),
  ifcModelId: z.string().optional(),
  geometryData: z.any().optional(),
  levelMapping: z.record(z.string(), z.string()).optional(),
})
export type ArchitectureRefNode = z.infer<typeof ArchitectureRefNode>
