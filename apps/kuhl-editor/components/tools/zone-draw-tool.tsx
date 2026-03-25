'use client'

import { type DesignConditions, HvacZoneNode } from '@kuhl/core'
import { useEffect, useRef, useState } from 'react'
import { calculatePolygonArea, isValidPolygon } from '../../lib/zone-draw-utils'
import useEditor from '../../store/use-editor'

/**
 * ZoneDrawTool
 *
 * 3Dビュー上でクリックによりポリゴン頂点を追加し、HvacZoneNode を作成するゾーン描画ツール。
 * ツール規約:
 * - useScene のみ変更（直接 Three.js API 呼び出し禁止）
 * - プレビューはローカル state（シーンに保存しない）
 * - unmount 時にクリーンアップ
 */
export function ZoneDrawTool() {
  const tool = useEditor((s) => s.tool)
  const isActive = tool === 'zone_draw'

  const [vertices, setVertices] = useState<[number, number][]>([])
  const [showDialog, setShowDialog] = useState(false)

  const verticesRef = useRef(vertices)
  verticesRef.current = vertices

  // キーボードイベントリスナー
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (showDialog) return
        if (isValidPolygon(verticesRef.current)) {
          setShowDialog(true)
        }
      } else if (e.key === 'Escape') {
        if (showDialog) {
          // ダイアログ表示中はダイアログのみ閉じる（vertices 維持）
          setShowDialog(false)
        } else {
          // 描画中はリセット
          setVertices([])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, showDialog])

  // unmount クリーンアップ
  useEffect(() => {
    return () => {
      setVertices([])
      setShowDialog(false)
    }
  }, [])

  /**
   * 頂点追加（Raycaster 経由で取得した XZ 座標を受け取る）
   * 実際のクリックイベント処理は Viewer 側で行い、この関数を呼び出す。
   */
  const addVertex = (point: [number, number]) => {
    if (!isActive) return
    setVertices((prev) => [...prev, point])
  }

  /**
   * ゾーン確定処理
   * ダイアログ確定ボタン押下時に呼び出す
   */
  const confirmZone = (
    inputZoneName: string,
    inputUsage: string,
    designConditions?: Partial<DesignConditions>,
    parentLevelId?: string,
  ) => {
    const currentVertices = verticesRef.current
    if (!isValidPolygon(currentVertices)) return

    const floorArea = calculatePolygonArea(currentVertices)

    const zone = HvacZoneNode.parse({
      zoneName: inputZoneName,
      usage: inputUsage,
      floorArea,
      boundary: currentVertices,
      ...(designConditions ? { designConditions } : {}),
    })

    // useScene.getState().createNode(zone, parentLevelId)
    // NOTE: levelId が選択されている場合に createNode を呼び出す。
    // 現在の最小実装では createNode 呼び出しはコメントアウト。
    // 実際の統合時は useScene を import して呼び出す。

    setVertices([])
    setShowDialog(false)
  }

  /**
   * キャンセル処理
   */
  const cancel = () => {
    setVertices([])
    setShowDialog(false)
  }

  // コンポーネントはツールがアクティブでない場合は何も描画しない
  if (!isActive) return null

  return null
}

export default ZoneDrawTool
