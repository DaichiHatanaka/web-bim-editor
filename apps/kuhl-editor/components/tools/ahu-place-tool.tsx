'use client'

import { AhuNode, useScene } from '@kuhl/core'
import type { PortDef } from '@kuhl/core'
import { useEffect, useState } from 'react'
import useEditor from '../../store/use-editor'

// ─── 純粋関数 ────────────────────────────────────────────────────────────────

/**
 * 既存タグから次のタグ番号を生成する
 * "AHU-101", "AHU-102" 形式。初回は 101 から開始。
 */
export function generateNextTag(prefix: string, existingTags: string[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)
  let maxNum = 100

  for (const tag of existingTags) {
    const match = tag.match(pattern)
    if (match) {
      const num = Number.parseInt(match[1]!, 10)
      if (num > maxNum) maxNum = num
    }
  }

  return `${prefix}-${maxNum + 1}`
}

/**
 * AHU 標準4ポート定義を返す
 */
export function createDefaultAhuPorts(): PortDef[] {
  return [
    {
      id: `port_sa_${Date.now()}`,
      name: '給気口',
      medium: 'supply_air',
      direction: 'out',
      position: [1, 0.5, 0] as [number, number, number],
      connectedTo: null,
    },
    {
      id: `port_ra_${Date.now()}`,
      name: '還気口',
      medium: 'return_air',
      direction: 'in',
      position: [-1, 0.5, 0] as [number, number, number],
      connectedTo: null,
    },
    {
      id: `port_cwi_${Date.now()}`,
      name: '冷水入口',
      medium: 'chilled_water',
      direction: 'in',
      position: [0, 0, 0.5] as [number, number, number],
      connectedTo: null,
    },
    {
      id: `port_cwo_${Date.now()}`,
      name: '冷水出口',
      medium: 'chilled_water',
      direction: 'out',
      position: [0, 0, -0.5] as [number, number, number],
      connectedTo: null,
    },
  ]
}

/**
 * PAC subType別ポート定義を返す
 */
export function createDefaultPacPorts(subType: string): PortDef[] {
  const refLiquid: PortDef = {
    id: `port_rl_${Date.now()}`,
    name: '冷媒液管',
    medium: 'refrigerant_liquid',
    direction: 'in',
    position: [0, 0, 0.3] as [number, number, number],
    connectedTo: null,
  }
  const refGas: PortDef = {
    id: `port_rg_${Date.now()}`,
    name: '冷媒ガス管',
    medium: 'refrigerant_gas',
    direction: 'out',
    position: [0, 0, -0.3] as [number, number, number],
    connectedTo: null,
  }

  switch (subType) {
    case 'outdoor_unit':
      return [
        { ...refLiquid, direction: 'out' },
        { ...refGas, direction: 'in' },
      ]

    case 'wall_mount':
      return [
        refLiquid,
        refGas,
        {
          id: `port_sa_${Date.now()}`,
          name: '給気口',
          medium: 'supply_air',
          direction: 'out',
          position: [0.5, 0, 0] as [number, number, number],
          connectedTo: null,
        },
      ]

    case 'ceiling_cassette':
    case 'ceiling_duct':
    case 'floor_standing':
    default:
      return [
        refLiquid,
        refGas,
        {
          id: `port_sa_${Date.now()}`,
          name: '給気口',
          medium: 'supply_air',
          direction: 'out',
          position: [0.5, 0, 0] as [number, number, number],
          connectedTo: null,
        },
        {
          id: `port_ra_${Date.now()}`,
          name: '還気口',
          medium: 'return_air',
          direction: 'in',
          position: [-0.5, 0, 0] as [number, number, number],
          connectedTo: null,
        },
      ]
  }
}

// ─── confirmPlacement 関数 ──────────────────────────────────────────────────

/**
 * AHU ノードを作成して useScene に追加する
 */
export function confirmAhuPlacement(
  position: [number, number, number],
  levelId: string,
): void {
  const { nodes, createNode } = useScene.getState()

  // 既存タグを収集
  const existingTags = Object.values(nodes)
    .filter((n) => n.type === 'ahu')
    .map((n) => (n as any).tag as string)

  const tag = generateNextTag('AHU', existingTags)
  const ports = createDefaultAhuPorts()

  const ahu = AhuNode.parse({
    name: tag,
    parentId: levelId,
    position,
    rotation: [0, 0, 0],
    dimensions: [2, 1.5, 1],
    tag,
    equipmentName: tag,
    lod: '100',
    status: 'planned',
    ports,
  })

  createNode(ahu, levelId as any)
}

// ─── AhuPlaceTool コンポーネント ─────────────────────────────────────────────

/**
 * AhuPlaceTool
 *
 * AHU（空調機）を配置するツール。
 */
export function AhuPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'ahu_place'

  // unmount クリーンアップ
  useEffect(() => {
    return () => {
      // ゴースト状態等のクリーンアップ
    }
  }, [])

  if (!isActive) return null

  return null
}

export default AhuPlaceTool
