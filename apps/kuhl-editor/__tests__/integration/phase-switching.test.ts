/**
 * TASK-0032: フェーズ切替統合テスト
 *
 * テストケース: TC-032-008, TC-032-009, TC-032-010
 *
 * カバー範囲:
 *   - 全5フェーズ順次切替の状態一貫性
 *   - フェーズ切替中のツール操作リセット
 *   - フェーズ切替+ノード操作の並行動作
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import useEditor, { phaseTools, type Phase } from '../../store/use-editor'
import {
  useScene,
  HvacZoneNode,
  AhuNode,
} from '@kuhl/core'
import { resetScene, buildHierarchy as buildLevel } from './helpers'

function resetEditor() {
  useEditor.setState({
    phase: 'zone',
    mode: 'select',
    tool: 'select',
  })
}

// ─── TC-032-008: 全5フェーズ順次切替 ────────────────────────────────────────

describe('TC-032-008: 全5フェーズ順次切替', () => {
  beforeEach(() => {
    resetEditor()
  })

  afterEach(() => {
    resetEditor()
  })

  it('zone→equip→route→calc→takeoff→zone の循環切替', () => {
    const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff', 'zone']

    for (const phase of phases) {
      useEditor.getState().setPhase(phase)
      const state = useEditor.getState()
      expect(state.phase).toBe(phase)
      expect(state.mode).toBe('select')
      expect(state.tool).toBe('select')
    }
  })

  it('各フェーズでgetAvailableToolsがphaseToolsと一致する', () => {
    const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']

    for (const phase of phases) {
      useEditor.getState().setPhase(phase)
      const available = useEditor.getState().getAvailableTools()
      expect(available).toEqual(phaseTools[phase])
    }
  })

  it('zone フェーズに戻ると初期状態と完全一致', () => {
    // 一巡してzoneに戻る
    useEditor.getState().setPhase('equip')
    useEditor.getState().setPhase('route')
    useEditor.getState().setPhase('zone')

    const state = useEditor.getState()
    expect(state.phase).toBe('zone')
    expect(state.mode).toBe('select')
    expect(state.tool).toBe('select')
    expect(state.getAvailableTools()).toEqual(phaseTools.zone)
  })

  it('全フェーズのツールリストはselectから始まる', () => {
    const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']
    for (const phase of phases) {
      useEditor.getState().setPhase(phase)
      const tools = useEditor.getState().getAvailableTools()
      expect(tools[0]).toBe('select')
    }
  })
})

// ─── TC-032-009: フェーズ切替中のツール操作 ──────────────────────────────────

describe('TC-032-009: フェーズ切替中のツール操作', () => {
  beforeEach(() => {
    resetEditor()
  })

  afterEach(() => {
    resetEditor()
  })

  it('zone_draw選択中にequip切替→tool=selectにリセット', () => {
    useEditor.getState().setPhase('zone')
    useEditor.getState().setTool('zone_draw')
    useEditor.getState().setMode('build')

    // equip フェーズに切替
    useEditor.getState().setPhase('equip')

    const state = useEditor.getState()
    expect(state.mode).toBe('select')
    expect(state.tool).toBe('select')
    expect(state.phase).toBe('equip')
  })

  it('equip→ahu_place選択→zone切替→tool=selectにリセット', () => {
    useEditor.getState().setPhase('equip')
    useEditor.getState().setTool('ahu_place')

    useEditor.getState().setPhase('zone')

    const state = useEditor.getState()
    expect(state.mode).toBe('select')
    expect(state.tool).toBe('select')
    expect(state.phase).toBe('zone')
  })

  it('フェーズ切替後に新フェーズのツールを選択できる', () => {
    useEditor.getState().setPhase('zone')
    useEditor.getState().setTool('zone_draw')

    useEditor.getState().setPhase('equip')
    useEditor.getState().setTool('ahu_place')

    const state = useEditor.getState()
    expect(state.tool).toBe('ahu_place')
    expect(state.phase).toBe('equip')
  })

  it('modeもリセットされる: build→切替→select', () => {
    useEditor.getState().setPhase('zone')
    useEditor.getState().setMode('build')
    expect(useEditor.getState().mode).toBe('build')

    useEditor.getState().setPhase('route')

    expect(useEditor.getState().mode).toBe('select')
  })
})

// ─── TC-032-010: フェーズ切替+ノード操作並行 ─────────────────────────────────

describe('TC-032-010: フェーズ切替+ノード操作並行', () => {
  beforeEach(() => {
    resetEditor()
    resetScene()
  })

  afterEach(() => {
    resetEditor()
    resetScene()
  })

  it('equip切替→AHU配置→zone切替→Zone描画が独立動作', () => {
    const { level } = buildLevel()
    const { createNode } = useScene.getState()

    // equip フェーズでAHU配置
    useEditor.getState().setPhase('equip')
    useEditor.getState().setTool('ahu_place')

    const ahu = AhuNode.parse({
      tag: 'AHU-001',
      equipmentName: 'AHU',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: [2, 1.5, 1],
      lod: '100',
      status: 'planned',
    })
    createNode(ahu, level.id)

    // zone フェーズでZone描画
    useEditor.getState().setPhase('zone')
    useEditor.getState().setTool('zone_draw')

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    // 両ノードがuseSceneに存在し、parentIdが正しい
    const { nodes } = useScene.getState()
    expect(nodes[ahu.id]).toBeDefined()
    expect(nodes[zone.id]).toBeDefined()
    expect((nodes[ahu.id] as any).parentId).toBe(level.id)
    expect((nodes[zone.id] as any).parentId).toBe(level.id)

    // editorのphaseはzone
    expect(useEditor.getState().phase).toBe('zone')
  })

  it('フェーズに関係なくuseSceneのノードは保持される', () => {
    const { level } = buildLevel()
    const { createNode } = useScene.getState()

    // 各フェーズでノードを作成しても、フェーズ切替でuseSceneは変わらない
    const zone1 = HvacZoneNode.parse({ zoneName: 'Zone-1', usage: 'office', floorArea: 50 })
    createNode(zone1, level.id)

    useEditor.getState().setPhase('equip')
    const zone2 = HvacZoneNode.parse({ zoneName: 'Zone-2', usage: 'meeting', floorArea: 60 })
    createNode(zone2, level.id)

    useEditor.getState().setPhase('calc')

    const { nodes } = useScene.getState()
    expect(nodes[zone1.id]).toBeDefined()
    expect(nodes[zone2.id]).toBeDefined()
  })
})
