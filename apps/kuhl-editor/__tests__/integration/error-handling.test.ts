/**
 * TASK-0032: エラーハンドリング統合テスト
 *
 * テストケース: TC-032-016 ~ TC-032-020
 *
 * カバー範囲:
 *   - floorArea=0 Zone + processLoadCalc
 *   - 不正usage + processLoadCalc
 *   - deltaT<=0 (summerDryBulb<=15)
 *   - 混在Zoneシナリオ
 *   - 存在しないノードIDへのupdateNode
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  useScene,
  HvacZoneNode,
  type AnyNodeId,
  processLoadCalc,
} from '@kuhl/core'
import { resetScene, buildHierarchy as buildLevel } from './helpers'

// ─── TC-032-016: floorArea=0 Zone + processLoadCalc ──────────────────────────

describe('TC-032-016: floorArea=0 Zone + processLoadCalc', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('floorArea=0のZoneはloadResult=undefinedになる', () => {
    const { level } = buildLevel()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-Zero',
      usage: 'office',
      floorArea: 0,
    })
    createNode(zone, level.id)

    // エラーが発生しないことを確認
    expect(() => processLoadCalc()).not.toThrow()

    const updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult).toBeUndefined()
  })
})

// ─── TC-032-017: 不正usage + processLoadCalc ────────────────────────────────

describe('TC-032-017: 不正usage + processLoadCalc', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('不正なusageはofficeフォールバックが適用される', () => {
    const { level } = buildLevel()
    const { createNode, updateNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    // Zodバリデーションをバイパスして不正usageを直接設定
    updateNode(zone.id, { usage: 'invalid_usage' as any })

    expect(() => processLoadCalc()).not.toThrow()

    const updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    // office フォールバック: coolingLoad = 150 * 100 = 15000
    expect(updatedZone.loadResult?.coolingLoad).toBeCloseTo(15000, 0)
    expect(updatedZone.loadResult?.heatingLoad).toBeCloseTo(10000, 0)
  })
})

// ─── TC-032-018: deltaT<=0 ───────────────────────────────────────────────────

describe('TC-032-018: deltaT<=0（summerDryBulb<=15）', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('summerDryBulb=15のとき requiredAirflow=0', () => {
    const { level } = buildLevel()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-Cold',
      usage: 'office',
      floorArea: 100,
      designConditions: {
        summerDryBulb: 15, // SUPPLY_AIR_TEMPERATURE と同じ → deltaT=0
        summerHumidity: 50,
        winterDryBulb: 22,
        winterHumidity: 40,
      },
    })
    createNode(zone, level.id)

    processLoadCalc()

    const updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.requiredAirflow).toBe(0)
  })

  it('summerDryBulb=10のとき（deltaT=-5）でもrequiredAirflow=0でエラーなし', () => {
    const { level } = buildLevel()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-VCold',
      usage: 'office',
      floorArea: 100,
      designConditions: {
        summerDryBulb: 10,
        summerHumidity: 50,
        winterDryBulb: 22,
        winterHumidity: 40,
      },
    })
    createNode(zone, level.id)

    expect(() => processLoadCalc()).not.toThrow()

    const updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.requiredAirflow).toBe(0)
  })
})

// ─── TC-032-019: 混在Zoneシナリオ ───────────────────────────────────────────

describe('TC-032-019: 混在Zoneシナリオ', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('正常Zone + floorArea=0 Zone が混在→正常Zoneのみ計算', () => {
    const { level } = buildLevel()
    const { createNode } = useScene.getState()

    // 正常Zone
    const normalZone = HvacZoneNode.parse({
      zoneName: 'Zone-Normal',
      usage: 'office',
      floorArea: 100,
    })
    createNode(normalZone, level.id)

    // floorArea=0 Zone
    const zeroZone = HvacZoneNode.parse({
      zoneName: 'Zone-Zero',
      usage: 'office',
      floorArea: 0,
    })
    createNode(zeroZone, level.id)

    expect(() => processLoadCalc()).not.toThrow()

    const { nodes } = useScene.getState()
    const updatedNormal = nodes[normalZone.id] as HvacZoneNode
    const updatedZero = nodes[zeroZone.id] as HvacZoneNode

    // 正常Zoneは計算済み
    expect(updatedNormal.loadResult).toBeDefined()
    expect(updatedNormal.loadResult?.coolingLoad).toBeCloseTo(15000, 0)

    // floorArea=0はundefined
    expect(updatedZero.loadResult).toBeUndefined()
  })
})

// ─── TC-032-020: 存在しないノードIDへのupdateNode ────────────────────────────

describe('TC-032-020: 存在しないノードIDへのupdateNode', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('存在しないIDへのupdateNodeは安全に無視される', () => {
    buildLevel()
    const nodeCountBefore = Object.keys(useScene.getState().nodes).length

    // 存在しないIDへ更新
    expect(() => {
      useScene.getState().updateNode('zone_nonexistent_id' as AnyNodeId, { floorArea: 999 } as any)
    }).not.toThrow()

    // ストアの状態が変化していない
    const nodeCountAfter = Object.keys(useScene.getState().nodes).length
    expect(nodeCountAfter).toBe(nodeCountBefore)
  })

  it('存在しないIDへのupdateNode後もprocessLoadCalcが正常動作', () => {
    const { level } = buildLevel()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({ zoneName: 'Zone-A', usage: 'office', floorArea: 100 })
    createNode(zone, level.id)

    // 存在しないIDへ更新
    useScene.getState().updateNode('zone_nonexistent_id' as AnyNodeId, { floorArea: 999 } as any)

    // processLoadCalcが正常動作すること
    expect(() => processLoadCalc()).not.toThrow()

    const updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.coolingLoad).toBeCloseTo(15000, 0)
  })
})
