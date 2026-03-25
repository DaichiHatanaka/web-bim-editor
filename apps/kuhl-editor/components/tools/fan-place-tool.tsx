'use client'

import { FanNode, useScene } from '@kuhl/core'
import type { PortDef } from '@kuhl/core'
import { useEffect } from 'react'
import useEditor from '../../store/use-editor'
import { generateNextTag } from './ahu-place-tool'

// ─── 純粋関数 ────────────────────────────────────────────────────────────────

/**
 * Fan 標準4ポート定義を返す
 */
export function createDefaultFanPorts(): PortDef[] {
  return [
    {
      id: `port_sa_${Date.now()}`,
      name: '給気口',
      medium: 'supply_air',
      direction: 'out',
      position: [0.4, 0, 0] as [number, number, number],
      connectedTo: null,
    },
    {
      id: `port_ra_${Date.now()}`,
      name: '還気口',
      medium: 'return_air',
      direction: 'in',
      position: [-0.4, 0, 0] as [number, number, number],
      connectedTo: null,
    },
    {
      id: `port_el_${Date.now()}`,
      name: '電源',
      medium: 'electric',
      direction: 'in',
      position: [0, -0.3, 0] as [number, number, number],
      connectedTo: null,
    },
    {
      id: `port_sig_${Date.now()}`,
      name: '信号',
      medium: 'signal',
      direction: 'in',
      position: [0, -0.3, 0.2] as [number, number, number],
      connectedTo: null,
    },
  ]
}

// ─── confirmPlacement 関数 ──────────────────────────────────────────────────

/**
 * Fan ノードを作成して useScene に追加する
 */
export function confirmFanPlacement(
  position: [number, number, number],
  levelId: string,
): void {
  const { nodes, createNode } = useScene.getState()

  const existingTags = Object.values(nodes)
    .filter((n) => n.type === 'fan')
    .map((n) => (n as any).tag as string)

  const tag = generateNextTag('FAN', existingTags)
  const ports = createDefaultFanPorts()

  const fan = FanNode.parse({
    name: tag,
    parentId: levelId,
    position,
    rotation: [0, 0, 0],
    dimensions: [0.8, 0.6, 0.8],
    tag,
    equipmentName: tag,
    lod: '100',
    status: 'planned',
    ports,
  })

  createNode(fan, levelId as any)
}

// ─── FanPlaceTool コンポーネント ─────────────────────────────────────────────

/**
 * FanPlaceTool
 *
 * ファンを配置するツール。
 */
export function FanPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'fan_place'

  useEffect(() => {
    return () => {
      // クリーンアップ
    }
  }, [])

  if (!isActive) return null

  return null
}

export default FanPlaceTool
