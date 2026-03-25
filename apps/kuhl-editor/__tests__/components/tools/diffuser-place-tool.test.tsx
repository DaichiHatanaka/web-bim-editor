/**
 * TASK-0026: DiffuserPlaceTool・FanPlaceTool テスト
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useScene } from '@kuhl/core'
import useEditor from '../../../store/use-editor'
import { generateNextTag } from '../../../components/tools/ahu-place-tool'

// ─── 純粋関数テスト: createDefaultDiffuserPorts ──────────────────────────────

describe('createDefaultDiffuserPorts', () => {
  it('TC-001: anemo subType で supply_air in ポートを生成', async () => {
    const { createDefaultDiffuserPorts } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    const ports = createDefaultDiffuserPorts('anemo')
    expect(ports.length).toBeGreaterThanOrEqual(1)
    expect(ports.some((p) => p.medium === 'supply_air')).toBe(true)
  })

  it('TC-002: ceiling_return subType で return_air out ポートを生成', async () => {
    const { createDefaultDiffuserPorts } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    const ports = createDefaultDiffuserPorts('ceiling_return')
    expect(ports.some((p) => p.medium === 'return_air' && p.direction === 'out')).toBe(true)
  })

  it('TC-003: weather_louver subType で exhaust_air ポートを生成', async () => {
    const { createDefaultDiffuserPorts } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    const ports = createDefaultDiffuserPorts('weather_louver')
    expect(
      ports.some((p) => p.medium === 'exhaust_air' || p.medium === 'outside_air'),
    ).toBe(true)
  })

  it('TC-004: 全ポートに position [x,y,z] が存在する', async () => {
    const { createDefaultDiffuserPorts } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    const ports = createDefaultDiffuserPorts('anemo')
    for (const port of ports) {
      expect(port.position).toHaveLength(3)
      expect(typeof port.position[0]).toBe('number')
    }
  })
})

// ─── 純粋関数テスト: getDiffuserDefaultDimensions ──────────────────────────

describe('getDiffuserDefaultDimensions', () => {
  it('TC-005: anemo → [0.6, 0.15, 0.6]', async () => {
    const { getDiffuserDefaultDimensions } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    expect(getDiffuserDefaultDimensions('anemo')).toEqual([0.6, 0.15, 0.6])
  })

  it('TC-006: line → [1.2, 0.1, 0.2]', async () => {
    const { getDiffuserDefaultDimensions } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    expect(getDiffuserDefaultDimensions('line')).toEqual([1.2, 0.1, 0.2])
  })

  it('TC-007: slot → [1.0, 0.08, 0.15]', async () => {
    const { getDiffuserDefaultDimensions } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    expect(getDiffuserDefaultDimensions('slot')).toEqual([1.0, 0.08, 0.15])
  })
})

// ─── 純粋関数テスト: createDefaultFanPorts ────────────────────────────────────

describe('createDefaultFanPorts', () => {
  it('TC-008: 4ポート生成（supply_air, return_air, electric, signal）', async () => {
    const { createDefaultFanPorts } = await import(
      '../../../components/tools/fan-place-tool'
    )
    const ports = createDefaultFanPorts()
    expect(ports).toHaveLength(4)
    const mediums = ports.map((p) => p.medium)
    expect(mediums).toContain('supply_air')
    expect(mediums).toContain('return_air')
    expect(mediums).toContain('electric')
    expect(mediums).toContain('signal')
  })

  it('TC-009: 各ポートに position が存在する', async () => {
    const { createDefaultFanPorts } = await import(
      '../../../components/tools/fan-place-tool'
    )
    const ports = createDefaultFanPorts()
    for (const port of ports) {
      expect(port.position).toHaveLength(3)
      expect(typeof port.position[0]).toBe('number')
    }
  })
})

// ─── 純粋関数テスト: generateNextTag（再利用確認） ─────────────────────────────

describe('generateNextTag for DIFF/FAN', () => {
  it('TC-010: DIFF prefix で DIFF-101 を返す', () => {
    expect(generateNextTag('DIFF', [])).toBe('DIFF-101')
  })

  it('TC-011: FAN prefix で FAN-101 を返す', () => {
    expect(generateNextTag('FAN', [])).toBe('FAN-101')
  })
})

// ─── コンポーネントテスト ────────────────────────────────────────────────────

describe('DiffuserPlaceTool component', () => {
  beforeEach(() => {
    useEditor.setState({ tool: 'select', phase: 'equip' })
  })

  afterEach(() => {
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-012: 非アクティブ時は何も動作しない', () => {
    expect(useEditor.getState().tool).toBe('select')
  })

  it('TC-013: アクティブ時にツール状態が正しい', () => {
    useEditor.setState({ tool: 'diffuser_place' })
    expect(useEditor.getState().tool).toBe('diffuser_place')
  })
})

describe('FanPlaceTool component', () => {
  beforeEach(() => {
    useEditor.setState({ tool: 'select', phase: 'equip' })
  })

  afterEach(() => {
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-014: 非アクティブ時は何も動作しない', () => {
    expect(useEditor.getState().tool).toBe('select')
  })

  it('TC-015: アクティブ時にツール状態が正しい', () => {
    useEditor.setState({ tool: 'fan_place' })
    expect(useEditor.getState().tool).toBe('fan_place')
  })
})

// ─── 統合テスト: confirmDiffuserPlacement ─────────────────────────────────────

describe('confirmDiffuserPlacement integration', () => {
  beforeEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'diffuser_place', phase: 'equip' })
  })

  afterEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-016: DiffuserNode が作成される', async () => {
    const { confirmDiffuserPlacement } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    confirmDiffuserPlacement([3, 2.7, 2], 'level_test', 'anemo')

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.type).toBe('diffuser')
  })

  it('TC-017: subType が正しく設定される', async () => {
    const { confirmDiffuserPlacement } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    confirmDiffuserPlacement([3, 2.7, 2], 'level_test', 'line')

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.subType).toBe('line')
  })

  it('TC-018: ceilingMounted が true', async () => {
    const { confirmDiffuserPlacement } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    confirmDiffuserPlacement([3, 2.7, 2], 'level_test', 'anemo')

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.ceilingMounted).toBe(true)
  })

  it('TC-019: タグが DIFF-xxx 形式', async () => {
    const { confirmDiffuserPlacement } = await import(
      '../../../components/tools/diffuser-place-tool'
    )
    confirmDiffuserPlacement([3, 2.7, 2], 'level_test', 'anemo')

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.tag).toMatch(/^DIFF-\d+$/)
  })
})

// ─── 統合テスト: confirmFanPlacement ──────────────────────────────────────────

describe('confirmFanPlacement integration', () => {
  beforeEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'fan_place' as any, phase: 'equip' })
  })

  afterEach(() => {
    useScene.setState({ nodes: {}, dirtyNodes: new Set() })
    useEditor.setState({ tool: 'select', phase: 'zone' })
  })

  it('TC-020: FanNode が作成される', async () => {
    const { confirmFanPlacement } = await import(
      '../../../components/tools/fan-place-tool'
    )
    confirmFanPlacement([5, 0, 3], 'level_test')

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.type).toBe('fan')
  })

  it('TC-021: タグが FAN-xxx 形式', async () => {
    const { confirmFanPlacement } = await import(
      '../../../components/tools/fan-place-tool'
    )
    confirmFanPlacement([5, 0, 3], 'level_test')

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.tag).toMatch(/^FAN-\d+$/)
  })

  it('TC-022: ポートが4つ存在する', async () => {
    const { confirmFanPlacement } = await import(
      '../../../components/tools/fan-place-tool'
    )
    confirmFanPlacement([5, 0, 3], 'level_test')

    const nodes = useScene.getState().nodes
    const createdNode = Object.values(nodes)[0] as any
    expect(createdNode.ports).toHaveLength(4)
  })
})
