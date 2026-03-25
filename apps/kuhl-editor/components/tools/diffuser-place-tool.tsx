'use client'

import { DiffuserNode, useScene } from '@kuhl/core'
import type { PortDef } from '@kuhl/core'
import { useEffect, useState } from 'react'
import useEditor from '../../store/use-editor'
import { generateNextTag } from './ahu-place-tool'

// ─── 純粋関数 ────────────────────────────────────────────────────────────────

/**
 * subType別のデフォルト寸法 [width, height, depth] を返す
 */
export function getDiffuserDefaultDimensions(
  subType: string,
): [number, number, number] {
  switch (subType) {
    case 'anemo':
      return [0.6, 0.15, 0.6]
    case 'line':
      return [1.2, 0.1, 0.2]
    case 'universal':
      return [0.6, 0.12, 0.6]
    case 'slot':
      return [1.0, 0.08, 0.15]
    case 'ceiling_return':
      return [0.6, 0.15, 0.6]
    case 'floor_supply':
      return [0.3, 0.1, 0.3]
    case 'wall_grille':
      return [0.6, 0.4, 0.1]
    case 'weather_louver':
      return [1.0, 0.8, 0.15]
    default:
      return [0.6, 0.15, 0.6]
  }
}

/**
 * subType別のデフォルトポート定義を返す
 */
export function createDefaultDiffuserPorts(subType: string): PortDef[] {
  switch (subType) {
    case 'ceiling_return':
      return [
        {
          id: `port_ra_${Date.now()}`,
          name: '還気口',
          medium: 'return_air',
          direction: 'out',
          position: [0, 0.1, 0] as [number, number, number],
          connectedTo: null,
        },
      ]

    case 'weather_louver':
      return [
        {
          id: `port_ea_${Date.now()}`,
          name: '排気口',
          medium: 'exhaust_air',
          direction: 'out',
          position: [0, 0, 0.1] as [number, number, number],
          connectedTo: null,
        },
      ]

    case 'wall_grille':
      return [
        {
          id: `port_oa_${Date.now()}`,
          name: '外気口',
          medium: 'outside_air',
          direction: 'in',
          position: [0, 0, 0.05] as [number, number, number],
          connectedTo: null,
        },
      ]

    // 給気系: anemo, line, universal, slot, floor_supply
    default:
      return [
        {
          id: `port_sa_${Date.now()}`,
          name: '給気口',
          medium: 'supply_air',
          direction: 'in',
          position: [0, 0.1, 0] as [number, number, number],
          connectedTo: null,
        },
      ]
  }
}

// ─── confirmPlacement 関数 ──────────────────────────────────────────────────

/**
 * Diffuser ノードを作成して useScene に追加する
 */
export function confirmDiffuserPlacement(
  position: [number, number, number],
  levelId: string,
  subType: string,
  neckSize?: string,
): void {
  const { nodes, createNode } = useScene.getState()

  const existingTags = Object.values(nodes)
    .filter((n) => n.type === 'diffuser')
    .map((n) => (n as any).tag as string)

  const tag = generateNextTag('DIFF', existingTags)
  const ports = createDefaultDiffuserPorts(subType)
  const dimensions = getDiffuserDefaultDimensions(subType)

  const diffuser = DiffuserNode.parse({
    name: tag,
    parentId: levelId,
    position,
    rotation: [0, 0, 0],
    dimensions,
    tag,
    equipmentName: tag,
    lod: '100',
    status: 'planned',
    subType,
    ceilingMounted: true,
    ports,
    ...(neckSize ? { neckSize } : {}),
  })

  createNode(diffuser, levelId as any)
}

// ─── DiffuserPlaceTool コンポーネント ─────────────────────────────────────────

/**
 * DiffuserPlaceTool
 *
 * ディフューザ（制気口）を配置するツール。
 */
export function DiffuserPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'diffuser_place'
  const [subType, setSubType] = useState<string>('anemo')

  useEffect(() => {
    return () => {
      setSubType('anemo')
    }
  }, [])

  if (!isActive) return null

  return null
}

export default DiffuserPlaceTool
