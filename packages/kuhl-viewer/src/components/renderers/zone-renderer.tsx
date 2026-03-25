/**
 * TASK-0013: HvacZoneRenderer（半透明床面ポリゴン）
 * HvacZoneNode の boundary ポリゴン座標から THREE.ShapeGeometry を生成し、
 * usage 別カラーマップで半透明着色したメッシュを ZONE_LAYER(2) に描画する
 * React Three Fiber コンポーネント。
 */

import type { FC } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useScene, sceneRegistry } from '@kuhl/core'
import type { ZoneUsage, AnyNodeId } from '@kuhl/core'
import { ZONE_LAYER } from '../../constants/layers'

// ─── カラーマップ ───────────────────────────────────────────────────────────

/** usage 別カラーマップ（全11種の ZoneUsage） */
export const ZONE_COLOR_MAP: Record<ZoneUsage, { color: string; opacity: number }> = {
  office: { color: '#4A90E2', opacity: 0.3 },
  meeting: { color: '#7ED321', opacity: 0.3 },
  server_room: { color: '#FF4757', opacity: 0.3 },
  lobby: { color: '#A8A8A8', opacity: 0.3 },
  corridor: { color: '#C8C8C8', opacity: 0.3 },
  toilet: { color: '#9B59B6', opacity: 0.3 },
  kitchen: { color: '#F39C12', opacity: 0.3 },
  warehouse: { color: '#795548', opacity: 0.3 },
  mechanical_room: { color: '#34495E', opacity: 0.3 },
  electrical_room: { color: '#E74C3C', opacity: 0.3 },
  other: { color: '#BDC3C7', opacity: 0.3 },
}

// ─── 純粋関数 ───────────────────────────────────────────────────────────────

/** boundary の有効性を判定する（3点以上の配列かどうか） */
export function isValidBoundary(boundary: unknown): boolean {
  if (!Array.isArray(boundary)) return false
  return boundary.length >= 3
}

/** boundary 配列から THREE.Shape を生成する（[x, z] を Shape の (x, y) として扱う） */
export function boundaryToShape(boundary: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape()

  if (!boundary || boundary.length === 0) {
    return shape
  }

  const first = boundary[0]!
  const [firstX, firstZ] = first
  shape.moveTo(firstX, firstZ)

  for (let i = 1; i < boundary.length; i++) {
    const [x, z] = boundary[i]!
    shape.lineTo(x, z)
  }

  shape.closePath()
  return shape
}

/** usage からカラーマップエントリを返す */
export function getZoneColor(usage: ZoneUsage): { color: string; opacity: number } {
  return ZONE_COLOR_MAP[usage]
}

/** boundary ポリゴンの重心座標を計算する（全頂点の平均値） */
export function computeCentroid(boundary: [number, number][]): [number, number] {
  if (!boundary || boundary.length === 0) return [0, 0]

  let sumX = 0
  let sumZ = 0
  for (const [x, z] of boundary) {
    sumX += x
    sumZ += z
  }
  return [sumX / boundary.length, sumZ / boundary.length]
}

// ─── ZoneRenderer コンポーネント ────────────────────────────────────────────

type ZoneRendererProps = {
  nodeId: AnyNodeId
}

/**
 * HvacZoneRenderer: boundary ポリゴンから半透明着色ゾーンを描画する React Three Fiber コンポーネント
 */
export const ZoneRenderer: FC<ZoneRendererProps> = ({ nodeId }) => {
  const node = useScene((state) => (nodeId ? state.nodes[nodeId] : undefined))
  const meshRef = useRef<THREE.Mesh>(null)

  const boundary = (node?.type === 'hvac_zone' && isValidBoundary(node.boundary)
    ? (node.boundary as [number, number][])
    : null)

  const shape = useMemo(
    () => (boundary ? boundaryToShape(boundary) : null),
    [boundary],
  )

  const geometry = useMemo(
    () => (shape ? new THREE.ShapeGeometry(shape) : null),
    [shape],
  )

  const material = useMemo(() => {
    if (!node || node.type !== 'hvac_zone') return null
    const { color, opacity } = getZoneColor(node.usage)
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }, [node])

  // sceneRegistry 登録/解除
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    sceneRegistry.nodes.set(nodeId, mesh)
    sceneRegistry.byType.hvac_zone.add(nodeId)

    return () => {
      sceneRegistry.nodes.delete(nodeId)
      sceneRegistry.byType.hvac_zone.delete(nodeId)
    }
  }, [nodeId])

  // ジオメトリ/マテリアル破棄（GPUメモリリーク防止）
  useEffect(() => {
    return () => {
      geometry?.dispose()
      material?.dispose()
    }
  }, [geometry, material])

  if (!geometry || !material) return null

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      onUpdate={(self) => {
        self.layers.set(ZONE_LAYER)
      }}
    />
  )
}
