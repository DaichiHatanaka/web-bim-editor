import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

export const Orientation = z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'])
export type Orientation = z.infer<typeof Orientation>

export const ZoneUsage = z.enum([
  'office',
  'meeting',
  'server_room',
  'lobby',
  'corridor',
  'toilet',
  'kitchen',
  'warehouse',
  'mechanical_room',
  'electrical_room',
  'other',
])
export type ZoneUsage = z.infer<typeof ZoneUsage>

export const HvacType = z.enum([
  'single_duct',
  'dual_duct',
  'fcu_oa',
  'vrf',
  'pac',
  'radiant',
  'displacement',
  'none',
])
export type HvacType = z.infer<typeof HvacType>

export const DesignConditions = z.object({
  summerDryBulb: z.number().default(26),
  summerHumidity: z.number().default(50),
  winterDryBulb: z.number().default(22),
  winterHumidity: z.number().default(40),
  ventilationRate: z.number().optional(),
  freshAirRate: z.number().optional(),
})
export type DesignConditions = z.infer<typeof DesignConditions>

export const LoadCalcResult = z.object({
  coolingLoad: z.number().optional(),
  heatingLoad: z.number().optional(),
  latentLoad: z.number().optional(),
  sensibleLoad: z.number().optional(),
  requiredAirflow: z.number().optional(),
})
export type LoadCalcResult = z.infer<typeof LoadCalcResult>

export const HvacZoneNode = BaseNode.extend({
  id: objectId('zone'),
  type: nodeType('hvac_zone'),
  children: z.array(z.string()).default([]),

  zoneName: z.string(),
  zoneCode: z.string().optional(),
  usage: ZoneUsage,

  floorArea: z.number(),
  ceilingHeight: z.number().default(2.7),
  occupancy: z.number().optional(),
  lightingDensity: z.number().optional(),
  equipmentDensity: z.number().optional(),

  designConditions: DesignConditions.default(() => DesignConditions.parse({})),
  loadResult: LoadCalcResult.optional(),

  hvacType: HvacType.optional(),
  systemId: z.string().optional(),

  boundary: z.array(z.tuple([z.number(), z.number()])).optional(),

  orientation: Orientation.optional(),
  glazingRatio: z.number().optional(),
})
export type HvacZoneNode = z.infer<typeof HvacZoneNode>
