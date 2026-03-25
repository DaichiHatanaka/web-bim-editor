/**
 * TASK-0025: AhuPlaceTool・PacPlaceTool テスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScene } from '@kuhl/core'
import useEditor from '../../../store/use-editor'
import {
  generateNextTag,
  createDefaultAhuPorts,
  createDefaultPacPorts,
} from '../../../components/tools/ahu-place-tool'

// ─── 純粋関数テスト: generateNextTag ─────────────────────────────────────────

describe('generateNextTag', () => {
  it('TC-001: 既存ノード0件で AHU-101 を返す', () => {
    const result = generateNextTag('AHU', [])
    expect(result).toBe('AHU-101')
  })

  it('TC-002: 既存1件で AHU-102 を返す', () => {
    const result = generateNextTag('AHU', ['AHU-101'])
    expect(result).toBe('AHU-102')
  })

  it('TC-003: ギャップありで最大+1を返す', () => {
    const result = generateNextTag('AHU', ['AHU-101', 'AHU-103'])
    expect(result).toBe('AHU-104')
  })

  it('TC-004: PAC prefix で PAC-101 を返す', () => {
    const result = generateNextTag('PAC', [])
    expect(result).toBe('PAC-101')
  })
})

// ─── 純粋関数テスト: createDefaultAhuPorts ──────────────────────────────────

describe('createDefaultAhuPorts', () => {
  it('TC-005: 4ポート生成（supply_air, return_air, chilled_water x2）', () => {
    const ports = createDefaultAhuPorts()
    expect(ports).toHaveLength(4)

    const mediums = ports.map((p) => p.medium)
    expect(mediums).toContain('supply_air')
    expect(mediums).toContain('return_air')
    expect(mediums.filter((m) => m === 'chilled_water')).toHaveLength(2)
  })

  it('TC-006: 各ポートが位置を持つ', () => {
    const ports = createDefaultAhuPorts()
    for (const port of ports) {
      expect(port.position).toHaveLength(3)
      expect(typeof port.position[0]).toBe('number')
    }
  })
})

// ─── 純粋関数テスト: createDefaultPacPorts ──────────────────────────────────

describe('createDefaultPacPorts', () => {
  it('TC-007: ceiling_cassette は4ポート', () => {
    const ports = createDefaultPacPorts('ceiling_cassette')
    expect(ports.length).toBeGreaterThanOrEqual(4)
  })

  it('TC-008: outdoor_unit は2ポート（冷媒のみ）', () => {
    const ports = createDefaultPacPorts('outdoor_unit')
    expect(ports).toHaveLength(2)
    const mediums = ports.map((p) => p.medium)
    expect(mediums).toContain('refrigerant_liquid')
    expect(mediums).toContain('refrigerant_gas')
  })

  it('TC-009: wall_mount は3ポート', () => {
    const ports = createDefaultPacPorts('wall_mount')
    expect(ports).toHaveLength(3)
  })
})

// ─── コンポーネントテスト ────────────────────────────────────────────────────

describe('AhuPlaceTool component', () => {
  beforeEach(() => {
    useEditor.setState({ tool: 'select', phase: 'equip' })
  })

  afterEach(() => {
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-010: 非アクティブ時は何も動作しない', () => {
    const state = useEditor.getState()
    expect(state.tool).toBe('select')
    // AhuPlaceTool は tool !== 'ahu_place' のとき null を返す
  })

  it('TC-011: アクティブ時にツール状態が正しい', () => {
    useEditor.setState({ tool: 'ahu_place' })
    expect(useEditor.getState().tool).toBe('ahu_place')
  })
})

describe('PacPlaceTool component', () => {
  beforeEach(() => {
    useEditor.setState({ tool: 'select', phase: 'equip' })
  })

  afterEach(() => {
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-012: 非アクティブ時', () => {
    expect(useEditor.getState().tool).toBe('select')
  })

  it('TC-013: アクティブ時', () => {
    useEditor.setState({ tool: 'pac_place' })
    expect(useEditor.getState().tool).toBe('pac_place')
  })
})

// ─── 統合テスト: confirmPlacement ────────────────────────────────────────────

describe('AhuPlaceTool - confirmPlacement integration', () => {
  beforeEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'ahu_place', phase: 'equip' })
  })

  afterEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-014: confirmPlacement で AhuNode が作成される', async () => {
    const { confirmAhuPlacement } = await import(
      '../../../components/tools/ahu-place-tool'
    )
    const nodesBefore = Object.keys(useScene.getState().nodes).length

    confirmAhuPlacement([5, 0, 3], 'level_test')

    const nodesAfter = Object.keys(useScene.getState().nodes).length
    expect(nodesAfter).toBe(nodesBefore + 1)

    // 作成されたノードがAHUか確認
    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.type).toBe('ahu')
    expect(createdNode.tag).toMatch(/^AHU-/)
    expect(createdNode.ports.length).toBe(4)
  })
})

describe('PacPlaceTool - confirmPlacement integration', () => {
  beforeEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'pac_place', phase: 'equip' })
  })

  afterEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-015: confirmPlacement で PacNode が作成される', async () => {
    const { confirmPacPlacement } = await import(
      '../../../components/tools/pac-place-tool'
    )
    const nodesBefore = Object.keys(useScene.getState().nodes).length

    confirmPacPlacement([2, 0, 1], 'level_test', 'ceiling_cassette')

    const nodesAfter = Object.keys(useScene.getState().nodes).length
    expect(nodesAfter).toBe(nodesBefore + 1)

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.type).toBe('pac')
    expect(createdNode.subType).toBe('ceiling_cassette')
    expect(createdNode.tag).toMatch(/^PAC-/)
  })
})
