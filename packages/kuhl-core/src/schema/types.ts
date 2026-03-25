import { z } from 'zod'
import { AhuNode } from './nodes/ahu'
import { ArchitectureRefNode } from './nodes/architecture-ref'
import { BoilerNode } from './nodes/boiler'
import { BuildingNode } from './nodes/building'
import { ChillerNode } from './nodes/chiller'
import { CoolingTowerNode } from './nodes/cooling-tower'
import { DamperNode } from './nodes/damper'
import { DiffuserNode } from './nodes/diffuser'
import { DuctFittingNode } from './nodes/duct-fitting'
import { DuctSegmentNode } from './nodes/duct-segment'
import { FanNode } from './nodes/fan'
import { FcuNode } from './nodes/fcu'
import { HvacZoneNode } from './nodes/hvac-zone'
import { LevelNode } from './nodes/level'
import { PacNode } from './nodes/pac'
import { PipeFittingNode } from './nodes/pipe-fitting'
import { PipeSegmentNode } from './nodes/pipe-segment'
import { PlantNode } from './nodes/plant'
import { PumpNode } from './nodes/pump'
import { SupportNode } from './nodes/support'
import { SystemNode } from './nodes/system'
import { ValveNode } from './nodes/valve'
import { VrfIndoorNode } from './nodes/vrf-indoor'
import { VrfOutdoorNode } from './nodes/vrf-outdoor'

export const AnyNode = z.discriminatedUnion('type', [
  PlantNode,
  BuildingNode,
  LevelNode,
  HvacZoneNode,
  AhuNode,
  PacNode,
  FcuNode,
  VrfOutdoorNode,
  VrfIndoorNode,
  DiffuserNode,
  DamperNode,
  FanNode,
  PumpNode,
  ChillerNode,
  BoilerNode,
  CoolingTowerNode,
  ValveNode,
  DuctSegmentNode,
  DuctFittingNode,
  PipeSegmentNode,
  PipeFittingNode,
  SystemNode,
  SupportNode,
  ArchitectureRefNode,
])

export type AnyNode = z.infer<typeof AnyNode>
export type AnyNodeType = AnyNode['type']
export type AnyNodeId = AnyNode['id']
