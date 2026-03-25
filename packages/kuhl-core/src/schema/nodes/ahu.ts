import { z } from 'zod'
import { nodeType, objectId } from '../base'
import { HvacEquipmentBase } from './hvac-equipment-base'

const CoolingCoil = z.object({
  rows: z.number().optional(),
  fpi: z.number().optional(),
  enteringWaterTemp: z.number().optional(),
  leavingWaterTemp: z.number().optional(),
  waterFlowRate: z.number().optional(),
})

const HeatingCoil = z.object({
  type: z.enum(['hot_water', 'steam', 'electric']).optional(),
  capacity: z.number().optional(),
  waterFlowRate: z.number().optional(),
})

const Humidifier = z.object({
  type: z.enum(['steam', 'spray', 'none']),
  capacity: z.number().optional(),
})

const HeatRecovery = z.object({
  type: z.enum(['total_heat', 'sensible', 'none']),
  efficiency: z.number().optional(),
})

export const AhuNode = HvacEquipmentBase.extend({
  id: objectId('ahu'),
  type: nodeType('ahu'),
  children: z.array(z.string()).default([]),

  coolingCapacity: z.number().optional(),
  heatingCapacity: z.number().optional(),
  airflowRate: z.number().optional(),
  staticPressure: z.number().optional(),
  motorPower: z.number().optional(),

  coolingCoil: CoolingCoil.optional(),
  heatingCoil: HeatingCoil.optional(),

  filterGrade: z.string().optional(),
  humidifier: Humidifier.optional(),
  heatRecovery: HeatRecovery.optional(),

  voltage: z.enum(['200V', '400V']).optional(),
  phase: z.enum(['single', 'three']).optional(),
})
export type AhuNode = z.infer<typeof AhuNode>
