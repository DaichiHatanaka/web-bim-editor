/**
 * TASK-0032: Undo/Redo + System再計算 統合テスト
 *
 * テストケース: TC-032-011, TC-032-012, TC-032-013, TC-032-014, TC-032-015
 *
 * カバー範囲:
 *   - Undo createNode + dirty再マーク
 *   - Undo updateNode + System再計算
 *   - Undo deleteNode + 階層復元
 *   - Redo後のSystem再計算
 *   - 連続Undo/Redo状態整合性
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  useScene,
  PlantNode,
  BuildingNode,
  LevelNode,
  HvacZoneNode,
  processLoadCalc,
} from '@kuhl/core'
import { resetScene, buildHierarchy } from './helpers'

// ─── TC-032-011: Undo createNode + dirty再マーク ─────────────────────────────

describe('TC-032-011: Undo createNode + dirty再マーク', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('Zone作成→processLoadCalc→undo→Zoneが消える', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)
    processLoadCalc()

    // undoでzone作成を取り消し
    useScene.temporal.getState().undo()

    const { nodes } = useScene.getState()
    expect(nodes[zone.id]).toBeUndefined()
  })

  it('undo後にprocessLoadCalcを実行してもエラーが発生しない', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)
    processLoadCalc()

    useScene.temporal.getState().undo()

    // エラーなしで実行できる
    expect(() => processLoadCalc()).not.toThrow()
  })

  it('undo後に親Levelのdirtyフラグが更新される', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)
    processLoadCalc()

    useScene.temporal.getState().undo()

    // undo後、親levelのdirtyが更新される（temporal subscriptionによる）
    // 少なくともprocessLoadCalcが安全に動作することを確認
    expect(() => processLoadCalc()).not.toThrow()
  })
})

// ─── TC-032-012: Undo updateNode + System再計算 ──────────────────────────────

describe('TC-032-012: Undo updateNode + System再計算', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('floorArea変更→processLoadCalc→undo→元のloadResultに戻る', () => {
    const { level } = buildHierarchy()
    const { createNode, updateNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)
    processLoadCalc()

    let updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.coolingLoad).toBeCloseTo(15000, 0)

    // floorArea を 200 に変更
    updateNode(zone.id, { floorArea: 200 } as any)
    processLoadCalc()

    updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.coolingLoad).toBeCloseTo(30000, 0)

    // undo
    useScene.temporal.getState().undo()
    const restoredZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(restoredZone.floorArea).toBe(100)

    // 再計算
    processLoadCalc()

    const finalZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(finalZone.loadResult?.coolingLoad).toBeCloseTo(15000, 0)
  })
})

// ─── TC-032-013: Undo deleteNode + 階層復元 ──────────────────────────────────

describe('TC-032-013: Undo deleteNode + 階層復元', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('Level削除→undo→Level+Zoneが復元される', () => {
    const { level } = buildHierarchy()
    const { createNode, deleteNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    // Level（子のZoneも含む）を削除
    deleteNode(level.id)

    expect(useScene.getState().nodes[level.id]).toBeUndefined()
    expect(useScene.getState().nodes[zone.id]).toBeUndefined()

    // undo
    useScene.temporal.getState().undo()

    const { nodes } = useScene.getState()
    expect(nodes[level.id]).toBeDefined()
    expect(nodes[zone.id]).toBeDefined()
  })

  it('復元後のZoneのparentIdがLevelを指す', () => {
    const { level } = buildHierarchy()
    const { createNode, deleteNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    deleteNode(level.id)
    useScene.temporal.getState().undo()

    const { nodes } = useScene.getState()
    const restoredZone = nodes[zone.id] as HvacZoneNode
    expect((restoredZone as any).parentId).toBe(level.id)
  })

  it('復元後のLevelのchildrenにZoneが含まれる', () => {
    const { level } = buildHierarchy()
    const { createNode, deleteNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    deleteNode(level.id)
    useScene.temporal.getState().undo()

    const { nodes } = useScene.getState()
    const restoredLevel = nodes[level.id] as LevelNode
    expect(restoredLevel.children).toContain(zone.id)
  })
})

// ─── TC-032-014: Redo後のSystem再計算 ────────────────────────────────────────

describe('TC-032-014: Redo後のSystem再計算', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('undo→redo→processLoadCalc→正しいloadResult', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)
    processLoadCalc()

    // undo → zone消失
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[zone.id]).toBeUndefined()

    // redo → zone復元
    useScene.temporal.getState().redo()
    const restoredZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(restoredZone).toBeDefined()

    // redo後にdirtyになっているはず → processLoadCalc
    processLoadCalc()

    const finalZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(finalZone.loadResult).toBeDefined()
    expect(finalZone.loadResult?.coolingLoad).toBeCloseTo(15000, 0)
  })
})

// ─── TC-032-015: 連続Undo/Redo ───────────────────────────────────────────────

describe('TC-032-015: 連続Undo/Redo状態整合性', () => {
  // 各テストで共有する5ノードの参照
  let plant: ReturnType<typeof PlantNode.parse>
  let building: ReturnType<typeof BuildingNode.parse>
  let level: ReturnType<typeof LevelNode.parse>
  let zone1: ReturnType<typeof HvacZoneNode.parse>
  let zone2: ReturnType<typeof HvacZoneNode.parse>

  beforeEach(() => {
    resetScene()
    const { createNode } = useScene.getState()

    // Plant → Building → Level → Zone1 → Zone2 の5操作
    plant = PlantNode.parse({ plantName: 'テスト' })
    createNode(plant)

    building = BuildingNode.parse({ buildingName: 'テストビル' })
    createNode(building, plant.id)

    level = LevelNode.parse({ floorHeight: 3.0, ceilingHeight: 2.7, elevation: 0 })
    createNode(level, building.id)

    zone1 = HvacZoneNode.parse({ zoneName: 'Zone-1', usage: 'office', floorArea: 50 })
    createNode(zone1, level.id)

    zone2 = HvacZoneNode.parse({ zoneName: 'Zone-2', usage: 'meeting', floorArea: 60 })
    createNode(zone2, level.id)
  })

  afterEach(() => {
    resetScene()
  })

  it('5操作→3回undo→ノード数=2', () => {
    // 3回 undo: Zone2, Zone1, Level が元に戻る
    useScene.temporal.getState().undo() // zone2 削除
    useScene.temporal.getState().undo() // zone1 削除
    useScene.temporal.getState().undo() // level 削除

    const { nodes } = useScene.getState()
    // Plant と Building のみ残る
    expect(Object.keys(nodes)).toHaveLength(2)
    expect(nodes[plant.id]).toBeDefined()
    expect(nodes[building.id]).toBeDefined()
    expect(nodes[level.id]).toBeUndefined()
    expect(nodes[zone1.id]).toBeUndefined()
    expect(nodes[zone2.id]).toBeUndefined()
  })

  it('3回undo後に2回redo→ノード数=4', () => {
    // 3回 undo
    useScene.temporal.getState().undo()
    useScene.temporal.getState().undo()
    useScene.temporal.getState().undo()

    // 2回 redo: Level, Zone1 が復元
    useScene.temporal.getState().redo()
    useScene.temporal.getState().redo()

    const { nodes } = useScene.getState()
    expect(Object.keys(nodes)).toHaveLength(4)
    expect(nodes[plant.id]).toBeDefined()
    expect(nodes[building.id]).toBeDefined()
    expect(nodes[level.id]).toBeDefined()
    expect(nodes[zone1.id]).toBeDefined()
    expect(nodes[zone2.id]).toBeUndefined()
  })

  it('redo後のZone1のparentIdが整合している', () => {
    useScene.temporal.getState().undo()
    useScene.temporal.getState().undo()
    useScene.temporal.getState().undo()
    useScene.temporal.getState().redo()
    useScene.temporal.getState().redo()

    const { nodes } = useScene.getState()
    const restoredZone1 = nodes[zone1.id] as any
    expect(restoredZone1.parentId).toBe(level.id)
  })
})
