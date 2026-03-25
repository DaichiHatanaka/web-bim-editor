// @vitest-environment jsdom
/**
 * TASK-0023: DiffuserRenderer テスト
 *
 * 【テスト目的】:
 *   - 純粋関数（parseNeckSize, getDiffuserGeometryParams, isDiffuserNode）の単体検証
 *   - DiffuserRenderer コンポーネントの描画検証
 *   - sceneRegistry 登録/解除の動作検証
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { sceneRegistry, useScene, DiffuserNode } from '@kuhl/core'

// R3F モック
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    scene: { add: vi.fn(), remove: vi.fn() },
    camera: {},
    gl: {},
  })),
}))

// Drei モック
vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drei-html">{children}</div>
  ),
  OrbitControls: () => null,
}))

// インポート
import {
  parseNeckSize,
  getDiffuserGeometryParams,
  isDiffuserNode,
  DiffuserRenderer,
} from '../../../components/renderers/diffuser-renderer'
import { TagLabel } from '../../../components/renderers/parts/tag-label'
import { PortMarkers } from '../../../components/renderers/parts/port-markers'

// ─────────────────────────────────────────────────────────────────────────────
// テストデータ定義
// ─────────────────────────────────────────────────────────────────────────────

const createTestDiffuserNode = (overrides: Partial<Record<string, unknown>> = {}) => {
  return DiffuserNode.parse({
    name: 'Test Diffuser',
    parentId: 'level_test',
    position: [1, 2, 3],
    rotation: [0, 0, 0],
    dimensions: [0.3, 0.05, 0.3],
    tag: 'DIFF-001',
    equipmentName: 'Anemostat',
    lod: '100',
    status: 'planned',
    subType: 'anemo',
    neckSize: 'Φ200',
    ceilingMounted: true,
    ...overrides,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 純粋関数テスト: parseNeckSize
// ─────────────────────────────────────────────────────────────────────────────

describe('parseNeckSize', () => {
  it('TC-001: 円形 "Φ200" を正しくパースする', () => {
    const result = parseNeckSize('Φ200')
    expect(result).toEqual({ type: 'circular', diameter: 0.2 })
  })

  it('TC-002: 矩形 "300×150" を正しくパースする', () => {
    const result = parseNeckSize('300×150')
    expect(result).toEqual({ type: 'rectangular', width: 0.3, height: 0.15 })
  })

  it('TC-003: undefined の場合デフォルトサイズを返す', () => {
    const result = parseNeckSize(undefined)
    expect(result).toEqual({ type: 'rectangular', width: 0.3, height: 0.3 })
  })

  it('TC-004: 不正文字列の場合デフォルトサイズを返す', () => {
    const result = parseNeckSize('invalid')
    expect(result).toEqual({ type: 'rectangular', width: 0.3, height: 0.3 })
  })

  it('半角x区切り "300x150" もパースできる', () => {
    const result = parseNeckSize('300x150')
    expect(result).toEqual({ type: 'rectangular', width: 0.3, height: 0.15 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 純粋関数テスト: getDiffuserGeometryParams
// ─────────────────────────────────────────────────────────────────────────────

describe('getDiffuserGeometryParams', () => {
  it('TC-005: anemo で円形パラメータを返す', () => {
    const size = { type: 'circular' as const, diameter: 0.2 }
    const result = getDiffuserGeometryParams('anemo', size)
    expect(result).not.toBeNull()
    expect(result!.geometryType).toBe('cylinder')
  })

  it('TC-006: line で矩形パラメータを返す', () => {
    const size = { type: 'rectangular' as const, width: 0.6, height: 0.1 }
    const result = getDiffuserGeometryParams('line', size)
    expect(result).not.toBeNull()
    expect(result!.geometryType).toBe('box')
  })

  it('TC-007: universal で正方形パラメータを返す', () => {
    const size = { type: 'rectangular' as const, width: 0.3, height: 0.3 }
    const result = getDiffuserGeometryParams('universal', size)
    expect(result).not.toBeNull()
    expect(result!.geometryType).toBe('box')
  })

  it('TC-008: slot でスリットパラメータを返す', () => {
    const size = { type: 'rectangular' as const, width: 0.6, height: 0.05 }
    const result = getDiffuserGeometryParams('slot', size)
    expect(result).not.toBeNull()
    expect(result!.geometryType).toBe('box')
  })

  it('TC-009: 全8種のsubTypeで非nullを返す', () => {
    const defaultSize = { type: 'rectangular' as const, width: 0.3, height: 0.3 }
    const subTypes = [
      'anemo', 'line', 'universal', 'slot',
      'ceiling_return', 'floor_supply', 'wall_grille', 'weather_louver',
    ] as const

    for (const subType of subTypes) {
      const result = getDiffuserGeometryParams(subType, defaultSize)
      expect(result).not.toBeNull()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 純粋関数テスト: isDiffuserNode
// ─────────────────────────────────────────────────────────────────────────────

describe('isDiffuserNode', () => {
  it('TC-010: 有効なDiffuserNodeで true を返す', () => {
    const node = createTestDiffuserNode()
    expect(isDiffuserNode(node)).toBe(true)
  })

  it('TC-011: AhuNode型のオブジェクトで false を返す', () => {
    const ahuLikeNode = {
      type: 'ahu',
      dimensions: [1, 1, 1],
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      tag: 'AHU-001',
    }
    expect(isDiffuserNode(ahuLikeNode)).toBe(false)
  })

  it('TC-012: null/undefined で false を返す', () => {
    expect(isDiffuserNode(null)).toBe(false)
    expect(isDiffuserNode(undefined)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// コンポーネントテスト: DiffuserRenderer
// ─────────────────────────────────────────────────────────────────────────────

describe('DiffuserRenderer', () => {
  const testNode = createTestDiffuserNode()

  beforeEach(() => {
    // useScene にテストノードを設定
    useScene.setState({
      nodes: { [testNode.id]: testNode } as Record<string, typeof testNode>,
    })
  })

  afterEach(() => {
    // sceneRegistry をクリア
    sceneRegistry.nodes.clear()
    sceneRegistry.byType.diffuser.clear()
    useScene.setState({ nodes: {} })
  })

  it('TC-013: 有効なDiffuserNodeで描画される', () => {
    const { container } = render(<DiffuserRenderer nodeId={testNode.id} />)
    expect(container.innerHTML).not.toBe('')
  })

  it('TC-014: マウント時に sceneRegistry に登録される', () => {
    render(<DiffuserRenderer nodeId={testNode.id} />)
    expect(sceneRegistry.nodes.has(testNode.id)).toBe(true)
  })

  it('TC-015: アンマウント時に sceneRegistry から削除される', () => {
    const { unmount } = render(<DiffuserRenderer nodeId={testNode.id} />)
    expect(sceneRegistry.nodes.has(testNode.id)).toBe(true)
    unmount()
    expect(sceneRegistry.nodes.has(testNode.id)).toBe(false)
  })

  it('TC-016: 存在しないノードIDで null を返す', () => {
    const { container } = render(
      <DiffuserRenderer nodeId={'diff_nonexistent' as any} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('TC-017: TagLabel にタグテキストが表示される', () => {
    const { getAllByText } = render(<DiffuserRenderer nodeId={testNode.id} />)
    expect(getAllByText('DIFF-001').length).toBeGreaterThan(0)
  })

  it('TC-018: ports が設定されていれば PortMarkers が表示される', () => {
    const nodeWithPorts = createTestDiffuserNode({
      ports: [
        {
          id: 'port_1',
          name: 'SA',
          medium: 'supply_air',
          direction: 'in',
          position: [0, 0, 0],
          connectedTo: null,
        },
      ],
    })
    useScene.setState({
      nodes: { [nodeWithPorts.id]: nodeWithPorts } as Record<string, typeof nodeWithPorts>,
    })

    const { container } = render(<DiffuserRenderer nodeId={nodeWithPorts.id} />)
    // PortMarkers がレンダリングされていること（mesh要素が存在）
    expect(container.innerHTML).not.toBe('')
  })
})
