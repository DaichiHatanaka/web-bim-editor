/**
 * TASK-0023: DiffuserRenderer
 *
 * 【機能概要】: DiffuserNode（制気口）をsubType別形状で描画するレンダラー
 * 【実装方針】: equipment-renderer.tsx パターンを踏襲し、subType別形状を生成する
 * 🔵 青信号: 要件定義書 REQ-201, REQ-202
 */

import type { AnyNodeId, DiffuserSubType } from '@kuhl/core'
import { sceneRegistry, useScene } from '@kuhl/core'
import type { FC } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getEquipmentColor } from '../../constants/equipment-colors'
import { SCENE_LAYER } from '../../constants/layers'
import { PortMarkers } from './parts/port-markers'
import { TagLabel } from './parts/tag-label'

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export interface DiffuserRendererProps {
  nodeId: AnyNodeId
}

export type NeckSizeParsed =
  | { type: 'circular'; diameter: number }
  | { type: 'rectangular'; width: number; height: number }

export type DiffuserGeometryParams =
  | { geometryType: 'cylinder'; radius: number; height: number }
  | { geometryType: 'box'; width: number; height: number; depth: number }

// ─── 純粋関数 ────────────────────────────────────────────────────────────────

const DEFAULT_SIZE: NeckSizeParsed = { type: 'rectangular', width: 0.3, height: 0.3 }

/**
 * neckSize 文字列をパースしてサイズオブジェクトを返す
 * "Φ200" → circular, "300×150" / "300x150" → rectangular
 */
export function parseNeckSize(neckSize: string | undefined): NeckSizeParsed {
  if (!neckSize) return DEFAULT_SIZE

  // 円形: "Φ200" or "φ200"
  const circularMatch = neckSize.match(/[Φφ](\d+)/)
  if (circularMatch) {
    const diameter = Number(circularMatch[1]) / 1000
    return { type: 'circular', diameter }
  }

  // 矩形: "300×150" or "300x150"
  const rectMatch = neckSize.match(/(\d+)[×xX](\d+)/)
  if (rectMatch) {
    const width = Number(rectMatch[1]) / 1000
    const height = Number(rectMatch[2]) / 1000
    return { type: 'rectangular', width, height }
  }

  return DEFAULT_SIZE
}

const DIFFUSER_THICKNESS = 0.03

/**
 * subType と parsedSize から geometry パラメータを返す
 */
export function getDiffuserGeometryParams(
  subType: string,
  size: NeckSizeParsed,
): DiffuserGeometryParams {
  const w = size.type === 'circular' ? size.diameter : size.width
  const h = size.type === 'rectangular' ? size.height : size.diameter

  switch (subType) {
    case 'anemo':
      return {
        geometryType: 'cylinder',
        radius: (size.type === 'circular' ? size.diameter : w) / 2,
        height: DIFFUSER_THICKNESS,
      }

    case 'line':
      return {
        geometryType: 'box',
        width: w * 2,
        height: DIFFUSER_THICKNESS,
        depth: h * 0.3,
      }

    case 'slot':
      return {
        geometryType: 'box',
        width: w * 2,
        height: DIFFUSER_THICKNESS,
        depth: h * 0.15,
      }

    case 'floor_supply':
      return {
        geometryType: 'cylinder',
        radius: w / 2,
        height: DIFFUSER_THICKNESS * 2,
      }

    case 'universal':
    case 'ceiling_return':
    case 'wall_grille':
    case 'weather_louver':
    default:
      return {
        geometryType: 'box',
        width: w,
        height: DIFFUSER_THICKNESS,
        depth: h,
      }
  }
}

/**
 * DiffuserNode 型ガード
 */
export function isDiffuserNode(node: unknown): node is { type: 'diffuser'; subType: string; [key: string]: unknown } {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>
  return (
    n.type === 'diffuser' &&
    typeof n.subType === 'string' &&
    Array.isArray(n.dimensions) &&
    Array.isArray(n.position) &&
    Array.isArray(n.rotation) &&
    typeof n.tag === 'string'
  )
}

// ─── DiffuserRenderer コンポーネント ──────────────────────────────────────────

export const DiffuserRenderer: FC<DiffuserRendererProps> = ({ nodeId }) => {
  const node = useScene((state) => (nodeId ? state.nodes[nodeId] : undefined))
  const meshRef = useRef<THREE.Mesh>(null)

  const diffuserNode = isDiffuserNode(node) ? node : null

  const parsedSize = useMemo(
    () => parseNeckSize(diffuserNode?.neckSize as string | undefined),
    [diffuserNode?.neckSize],
  )

  const geoParams = useMemo(
    () => (diffuserNode ? getDiffuserGeometryParams(diffuserNode.subType, parsedSize) : null),
    [diffuserNode?.subType, parsedSize],
  )

  const geometry = useMemo(() => {
    if (!geoParams) return null
    if (geoParams.geometryType === 'cylinder') {
      return new THREE.CylinderGeometry(geoParams.radius, geoParams.radius, geoParams.height, 32)
    }
    return new THREE.BoxGeometry(geoParams.width, geoParams.height, geoParams.depth)
  }, [geoParams])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: getEquipmentColor('diffuser'),
        transparent: false,
        roughness: 0.7,
        metalness: 0.1,
      }),
    [],
  )

  // sceneRegistry 登録/解除
  useEffect(() => {
    if (!diffuserNode) return
    const mesh = meshRef.current
    if (!mesh) return

    sceneRegistry.nodes.set(nodeId, mesh)
    if (sceneRegistry.byType.diffuser) {
      sceneRegistry.byType.diffuser.add(nodeId)
    }

    return () => {
      sceneRegistry.nodes.delete(nodeId)
      if (sceneRegistry.byType.diffuser) {
        sceneRegistry.byType.diffuser.delete(nodeId)
      }
    }
  }, [nodeId, diffuserNode])

  // GPU メモリ解放
  useEffect(() => {
    return () => {
      geometry?.dispose()
      material?.dispose()
    }
  }, [geometry, material])

  if (!diffuserNode || !geometry) return null

  const dimensions = diffuserNode.dimensions as [number, number, number]
  const tagLabelOffset: [number, number, number] = [0, dimensions[1] / 2 + 0.3, 0]

  return (
    <group
      position={diffuserNode.position as [number, number, number]}
      rotation={diffuserNode.rotation as [number, number, number]}
      visible={diffuserNode.visible !== false}
    >
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onUpdate={(self) => {
          self.layers.set(SCENE_LAYER)
        }}
      />

      <TagLabel tag={diffuserNode.tag as string} offset={tagLabelOffset} />
      <PortMarkers ports={(diffuserNode.ports as any[]) ?? []} />
    </group>
  )
}
