/**
 * TASK-0032: 負荷計算・ストア操作パフォーマンステスト
 *
 * テストケース: TC-032-021, TC-032-022, TC-032-023
 *
 * カバー範囲:
 *   - 100ゾーン processLoadCalc パフォーマンス (< 1000ms)
 *   - 100ノード一括createNodes パフォーマンス (< 1000ms)
 *   - calculateZoneLoad 単一実行パフォーマンス (1000回 < 1000ms)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import useScene, { clearSceneHistory } from '../../store/use-scene'
import { PlantNode } from '../../schema/nodes/plant'
import { BuildingNode } from '../../schema/nodes/building'
import { LevelNode } from '../../schema/nodes/level'
import { HvacZoneNode } from '../../schema/nodes/hvac-zone'
import { AhuNode } from '../../schema/nodes/ahu'
import { processLoadCalc } from '../../systems/zone/load-calc-system'
import { calculateZoneLoad } from '../../systems/zone/load-calc'
import type { ZoneUsage } from '../../schema/nodes/hvac-zone'

function resetScene() {
  useScene.getState().unloadScene()
  clearSceneHistory()
}

function buildBaseHierarchy() {
  const { createNode } = useScene.getState()
  const plant = PlantNode.parse({ plantName: 'テストプラント' })
  createNode(plant)
  const building = BuildingNode.parse({ buildingName: 'テストビル' })
  createNode(building, plant.id)
  const level = LevelNode.parse({ floorHeight: 3.0, ceilingHeight: 2.7, elevation: 0 })
  createNode(level, building.id)
  return { plant, building, level }
}

const ZONE_USAGES: ZoneUsage[] = [
  'office', 'meeting', 'server_room', 'lobby', 'corridor',
  'toilet', 'kitchen', 'warehouse', 'mechanical_room', 'electrical_room',
]

// ─── TC-032-021: 100ゾーン processLoadCalc パフォーマンス ─────────────────────

describe('TC-032-021: 100ゾーン processLoadCalc パフォーマンス', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('100ゾーンのprocessLoadCalcが1000ms以内に完了する', () => {
    const { level } = buildBaseHierarchy()
    const { createNode } = useScene.getState()

    // 100ゾーンを作成
    for (let i = 0; i < 100; i++) {
      const usage = ZONE_USAGES[i % ZONE_USAGES.length]!
      const floorArea = 50 + (i % 150) // 50〜199 の範囲
      const zone = HvacZoneNode.parse({
        zoneName: `Zone-${i}`,
        usage,
        floorArea,
      })
      createNode(zone, level.id)
    }

    const start = performance.now()
    processLoadCalc()
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(1000)
  })

  it('100ゾーン全てのloadResultが定義済みになる', () => {
    const { level } = buildBaseHierarchy()
    const { createNode } = useScene.getState()

    const zoneIds: string[] = []
    for (let i = 0; i < 100; i++) {
      const usage = ZONE_USAGES[i % ZONE_USAGES.length]!
      const floorArea = 50 + (i % 150)
      const zone = HvacZoneNode.parse({ zoneName: `Zone-${i}`, usage, floorArea })
      createNode(zone, level.id)
      zoneIds.push(zone.id)
    }

    processLoadCalc()

    const { nodes } = useScene.getState()
    for (const zoneId of zoneIds) {
      const zone = nodes[zoneId as any] as HvacZoneNode
      expect(zone.loadResult).toBeDefined()
      expect(zone.loadResult?.coolingLoad).toBeGreaterThan(0)
    }
  })

  it('100ゾーン処理後にdirtyNodesからhvac_zoneが消える', () => {
    const { level } = buildBaseHierarchy()
    const { createNode } = useScene.getState()

    const zoneIds: string[] = []
    for (let i = 0; i < 100; i++) {
      const zone = HvacZoneNode.parse({
        zoneName: `Zone-${i}`,
        usage: 'office',
        floorArea: 100,
      })
      createNode(zone, level.id)
      zoneIds.push(zone.id)
    }

    processLoadCalc()

    const { dirtyNodes } = useScene.getState()
    for (const zoneId of zoneIds) {
      expect(dirtyNodes.has(zoneId as any)).toBe(false)
    }
  })
})

// ─── TC-032-022: 100ノード一括createNodes パフォーマンス ──────────────────────

describe('TC-032-022: 100ノード一括createNodes パフォーマンス', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('100個のAhuNodeをcreateNodesで一括作成: 1000ms以内', () => {
    const { level } = buildBaseHierarchy()

    const ahuOps = Array.from({ length: 100 }, (_, i) => ({
      node: AhuNode.parse({
        tag: `AHU-${String(i).padStart(3, '0')}`,
        equipmentName: `AHU Unit ${i}`,
        position: [i * 3, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        dimensions: [2, 1.5, 1] as [number, number, number],
        lod: '100',
        status: 'planned',
      }),
      parentId: level.id,
    }))

    const start = performance.now()
    useScene.getState().createNodes(ahuOps)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(1000)
  })

  it('100ノード作成後のノード総数が103 (Plant+Building+Level+100 AHU)', () => {
    const { level } = buildBaseHierarchy()

    const ahuOps = Array.from({ length: 100 }, (_, i) => ({
      node: AhuNode.parse({
        tag: `AHU-${String(i).padStart(3, '0')}`,
        equipmentName: `AHU Unit ${i}`,
        position: [i * 3, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        dimensions: [2, 1.5, 1] as [number, number, number],
        lod: '100',
        status: 'planned',
      }),
      parentId: level.id,
    }))

    useScene.getState().createNodes(ahuOps)

    const nodeCount = Object.keys(useScene.getState().nodes).length
    expect(nodeCount).toBe(103) // Plant + Building + Level + 100 AHU
  })
})

// ─── TC-032-023: calculateZoneLoad 単一実行パフォーマンス ─────────────────────

describe('TC-032-023: calculateZoneLoad 単一実行パフォーマンス', () => {
  it('1000回実行が1000ms以内（平均1ms以下）', () => {
    const testZone = {
      floorArea: 100,
      usage: 'office' as ZoneUsage,
      designConditions: {
        summerDryBulb: 26,
        summerHumidity: 50,
        winterDryBulb: 22,
        winterHumidity: 40,
      },
      orientation: 'S' as const,
      glazingRatio: 0.4,
    }

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      calculateZoneLoad(testZone)
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(1000)
  })

  it('calculateZoneLoadは正しい結果を返す（office, 100m2, 方位S, glazing0.4）', () => {
    const testZone = {
      floorArea: 100,
      usage: 'office' as ZoneUsage,
      designConditions: {
        summerDryBulb: 26,
        summerHumidity: 50,
        winterDryBulb: 22,
        winterHumidity: 40,
      },
      orientation: 'S' as const,
      glazingRatio: 0.4,
    }

    const result = calculateZoneLoad(testZone)
    expect(result).toBeDefined()
    expect(result!.coolingLoad).toBeGreaterThan(0)
    expect(result!.heatingLoad).toBeGreaterThan(0)
    expect(result!.requiredAirflow).toBeGreaterThan(0)
  })
})
