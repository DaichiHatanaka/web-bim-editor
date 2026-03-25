/**
 * TASK-0024: EquipmentSystem（ポート位置計算）
 *
 * 【機能概要】: dirtyNodes から機器ノードを検出し、ポート位置をワールド座標で計算する
 * 【実装方針】: LoadCalcSystem パターンを踏襲。純粋関数 + processEquipmentSystem
 * 🔵 青信号: REQ-203, architecture.md EquipmentSystem
 */

import type { HvacEquipmentBase, PortDef } from '../../schema/nodes/hvac-equipment-base'
import useScene from '../../store/use-scene'

// ─── 機器タイプ判定 ──────────────────────────────────────────────────────────

const EQUIPMENT_TYPES = new Set([
  'ahu', 'pac', 'fcu', 'vrf_outdoor', 'vrf_indoor', 'diffuser',
  'damper', 'fan', 'pump', 'chiller', 'boiler', 'cooling_tower', 'valve',
])

function isEquipmentNode(node: unknown): node is HvacEquipmentBase {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>
  return (
    typeof n.type === 'string' &&
    EQUIPMENT_TYPES.has(n.type) &&
    Array.isArray(n.position) &&
    Array.isArray(n.rotation) &&
    Array.isArray(n.ports)
  )
}

// ─── 純粋関数 ────────────────────────────────────────────────────────────────

/**
 * ポートのローカルオフセットを機器の position + rotation(Euler) でワールド座標に変換する
 */
export function calculatePortWorldPosition(
  portLocalOffset: [number, number, number],
  equipmentPosition: [number, number, number],
  equipmentRotation: [number, number, number],
): [number, number, number] {
  const [ox, oy, oz] = portLocalOffset
  const [px, py, pz] = equipmentPosition
  const [rx, ry, rz] = equipmentRotation

  // Euler rotation (XYZ order) applied to the offset
  const cosX = Math.cos(rx)
  const sinX = Math.sin(rx)
  const cosY = Math.cos(ry)
  const sinY = Math.sin(ry)
  const cosZ = Math.cos(rz)
  const sinZ = Math.sin(rz)

  // Rotation matrix (XYZ Euler angles)
  // Ry * Rx * Rz applied to offset vector
  // Using Three.js default Euler order: XYZ
  // First apply Z, then X, then Y
  const x1 = cosZ * ox - sinZ * oy
  const y1 = sinZ * ox + cosZ * oy
  const z1 = oz

  const x2 = x1
  const y2 = cosX * y1 - sinX * z1
  const z2 = sinX * y1 + cosX * z1

  const x3 = cosY * x2 + sinY * z2
  const y3 = y2
  const z3 = -sinY * x2 + cosY * z2

  return [
    px + x3,
    py + y3,
    pz + z3,
  ]
}

/**
 * ポート接続の有効性を検証する
 */
export function validatePortConnections(
  ports: PortDef[],
  allNodeIds: Set<string>,
): { portId: string; valid: boolean }[] {
  return ports.map((port) => ({
    portId: port.id,
    valid: port.connectedTo === null || allNodeIds.has(port.connectedTo),
  }))
}

/**
 * 未接続ポート（connectedTo === null）のリストを返す
 */
export function getUnconnectedPorts(ports: PortDef[]): PortDef[] {
  return ports.filter((port) => port.connectedTo === null)
}

// ─── processEquipmentSystem ──────────────────────────────────────────────────

/**
 * dirtyNodes を走査して機器ノードのポート位置を再計算する
 */
export function processEquipmentSystem(): void {
  const { dirtyNodes, nodes, updateNode, clearDirty } = useScene.getState()

  for (const id of Array.from(dirtyNodes)) {
    const node = nodes[id]
    if (!isEquipmentNode(node)) {
      clearDirty(id)
      continue
    }

    const equipment = node as HvacEquipmentBase
    const ports = equipment.ports
    if (!ports || ports.length === 0) {
      clearDirty(id)
      continue
    }

    const eqPosition = equipment.position as [number, number, number]
    const eqRotation = equipment.rotation as [number, number, number]

    const updatedPorts: PortDef[] = ports.map((port) => ({
      ...port,
      position: calculatePortWorldPosition(
        port.position as [number, number, number],
        eqPosition,
        eqRotation,
      ),
    }))

    updateNode(id, { ports: updatedPorts })
    clearDirty(id)
  }
}

// ─── EquipmentSystem コンポーネント ──────────────────────────────────────────

let EquipmentSystem: React.FC

try {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import for conditional R3F usage
  const { useFrame } = require('@react-three/fiber') as any

  EquipmentSystem = function EquipmentSystemImpl() {
    useFrame(processEquipmentSystem, 3)
    return null
  }
  EquipmentSystem.displayName = 'EquipmentSystem'
} catch {
  EquipmentSystem = function EquipmentSystemFallback() {
    return null
  }
  EquipmentSystem.displayName = 'EquipmentSystem'
}

export { EquipmentSystem }
