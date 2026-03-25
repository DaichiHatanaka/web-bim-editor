'use client'

import { PacNode, useScene } from '@kuhl/core'
import { useEffect, useState } from 'react'
import useEditor from '../../store/use-editor'
import { generateNextTag, createDefaultPacPorts } from './ahu-place-tool'

// ─── confirmPlacement 関数 ──────────────────────────────────────────────────

/**
 * PAC ノードを作成して useScene に追加する
 */
export function confirmPacPlacement(
  position: [number, number, number],
  levelId: string,
  subType: string,
): void {
  const { nodes, createNode } = useScene.getState()

  const existingTags = Object.values(nodes)
    .filter((n) => n.type === 'pac')
    .map((n) => (n as any).tag as string)

  const tag = generateNextTag('PAC', existingTags)
  const ports = createDefaultPacPorts(subType)

  const pac = PacNode.parse({
    name: tag,
    parentId: levelId,
    position,
    rotation: [0, 0, 0],
    dimensions: [1, 0.3, 1],
    tag,
    equipmentName: tag,
    lod: '100',
    status: 'planned',
    subType,
    ports,
  })

  createNode(pac, levelId as any)
}

// ─── PacPlaceTool コンポーネント ─────────────────────────────────────────────

/**
 * PacPlaceTool
 *
 * PAC（パッケージ型空調機）を配置するツール。
 */
export function PacPlaceTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'pac_place'
  const [subType, setSubType] = useState<string>('ceiling_cassette')

  useEffect(() => {
    return () => {
      setSubType('ceiling_cassette')
    }
  }, [])

  if (!isActive) return null

  return null
}

export default PacPlaceTool
