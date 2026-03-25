/**
 * TC-001 ~ TC-017: ゾーン一覧パネル・負荷集計表示 テスト
 *
 * Red Phase: 実装ファイル (components/panels/zone-list-panel.tsx) が存在しないため
 * import 時点でモジュール解決エラーが発生し、全テストが失敗する。
 *
 * テスト対象:
 *   - getZonesFromScene (純粋関数)
 *   - calculateZoneSummary (純粋関数)
 *   - formatLoadValue (純粋関数)
 *   - formatAreaValue (純粋関数)
 *   - ZONE_USAGE_LABELS (定数)
 *
 * モック対象: なし（全て純粋関数・定数）
 *
 * 参照要件: REQ-105, REQ-110, EDGE-101
 * 参照設計: TASK-0018 要件定義書 §2, §4
 */

import { describe, expect, it } from 'vitest'

import {
  ZONE_USAGE_LABELS,
  calculateZoneSummary,
  formatAreaValue,
  formatLoadValue,
  getZonesFromScene,
} from '../../../components/panels/zone-list-panel'

// =================================================================
// ヘルパー関数
// =================================================================

/**
 * HvacZoneNode の最小テストデータを生成するヘルパー
 * 必須フィールドのみを持つ hvac_zone ノードを返す
 */
function createMockZone(
  overrides: {
    id?: string
    parentId?: string | null
    zoneName?: string
    usage?: string
    floorArea?: number
    loadResult?: { coolingLoad?: number; heatingLoad?: number } | undefined
  } = {},
) {
  return {
    object: 'node' as const,
    id: overrides.id ?? 'zone_test001',
    type: 'hvac_zone' as const,
    parentId: overrides.parentId ?? 'level_001',
    visible: true,
    metadata: {},
    children: [],
    zoneName: overrides.zoneName ?? 'テストゾーン',
    usage: overrides.usage ?? 'office',
    floorArea: overrides.floorArea ?? 50,
    ceilingHeight: 2.7,
    designConditions: {
      summerDryBulb: 26,
      summerHumidity: 50,
      winterDryBulb: 22,
      winterHumidity: 40,
    },
    loadResult: overrides.loadResult,
  }
}

/**
 * LevelNode の最小テストデータを生成するヘルパー
 */
function createMockLevel(id = 'level_001') {
  return {
    object: 'node' as const,
    id,
    type: 'level' as const,
    parentId: 'building_001',
    visible: true,
    metadata: {},
    name: '1F',
    elevation: 0,
    height: 3.5,
  }
}

// =================================================================
// テスト本体
// =================================================================

describe('zone-list-panel', () => {
  // ===============================================================
  // 1. getZonesFromScene テスト
  // ===============================================================
  describe('getZonesFromScene', () => {
    describe('正常系', () => {
      it('TC-001: hvac_zone ノードのみ抽出される', () => {
        const level = createMockLevel()
        const zone1 = createMockZone({ id: 'zone_aaa', zoneName: 'ゾーンA' })
        const zone2 = createMockZone({ id: 'zone_bbb', zoneName: 'ゾーンB' })

        const nodes: Record<string, any> = {
          [level.id]: level,
          [zone1.id]: zone1,
          [zone2.id]: zone2,
        }

        const result = getZonesFromScene(nodes)
        expect(result).toHaveLength(2)
        expect(result.every((n) => n.type === 'hvac_zone')).toBe(true)
      })

      it('TC-002: levelId 指定で該当レベルのゾーンのみ返す', () => {
        const zone1 = createMockZone({
          id: 'zone_aaa',
          parentId: 'level_001',
          zoneName: 'ゾーンA',
        })
        const zone2 = createMockZone({
          id: 'zone_bbb',
          parentId: 'level_002',
          zoneName: 'ゾーンB',
        })
        const zone3 = createMockZone({
          id: 'zone_ccc',
          parentId: 'level_001',
          zoneName: 'ゾーンC',
        })

        const nodes: Record<string, any> = {
          [zone1.id]: zone1,
          [zone2.id]: zone2,
          [zone3.id]: zone3,
        }

        const result = getZonesFromScene(nodes, 'level_001')
        expect(result).toHaveLength(2)
        expect(result.map((z) => z.id)).toContain('zone_aaa')
        expect(result.map((z) => z.id)).toContain('zone_ccc')
        expect(result.map((z) => z.id)).not.toContain('zone_bbb')
      })
    })

    describe('エッジケース', () => {
      it('TC-003: 空の nodes 辞書で空配列を返す', () => {
        const result = getZonesFromScene({})
        expect(result).toEqual([])
      })

      it('TC-004: hvac_zone が存在しない nodes で空配列を返す', () => {
        const level = createMockLevel()
        const nodes: Record<string, any> = { [level.id]: level }

        const result = getZonesFromScene(nodes)
        expect(result).toEqual([])
      })
    })
  })

  // ===============================================================
  // 2. calculateZoneSummary テスト
  // ===============================================================
  describe('calculateZoneSummary', () => {
    describe('正常系', () => {
      it('TC-005: 複数ゾーンの面積・負荷を正しく合計する', () => {
        const zones = [
          createMockZone({
            id: 'zone_aaa',
            floorArea: 50,
            loadResult: { coolingLoad: 5000, heatingLoad: 4000 },
          }),
          createMockZone({
            id: 'zone_bbb',
            floorArea: 30,
            loadResult: { coolingLoad: 3000, heatingLoad: 2000 },
          }),
        ]

        const summary = calculateZoneSummary(zones as any)
        expect(summary.totalArea).toBe(80)
        expect(summary.totalCoolingLoad).toBe(8000)
        expect(summary.totalHeatingLoad).toBe(6000)
        expect(summary.zoneCount).toBe(2)
      })

      it('TC-006: loadResult が undefined のゾーンは負荷 0 として合計する', () => {
        const zones = [
          createMockZone({
            id: 'zone_aaa',
            floorArea: 50,
            loadResult: undefined,
          }),
          createMockZone({
            id: 'zone_bbb',
            floorArea: 30,
            loadResult: { coolingLoad: 3000, heatingLoad: 2000 },
          }),
        ]

        const summary = calculateZoneSummary(zones as any)
        expect(summary.totalArea).toBe(80)
        expect(summary.totalCoolingLoad).toBe(3000)
        expect(summary.totalHeatingLoad).toBe(2000)
        expect(summary.zoneCount).toBe(2)
      })
    })

    describe('エッジケース', () => {
      it('TC-007: 空配列で全て 0 を返す', () => {
        const summary = calculateZoneSummary([])
        expect(summary.totalArea).toBe(0)
        expect(summary.totalCoolingLoad).toBe(0)
        expect(summary.totalHeatingLoad).toBe(0)
        expect(summary.zoneCount).toBe(0)
      })

      it('TC-008: loadResult の coolingLoad/heatingLoad が個別に undefined でも正しく合計', () => {
        const zones = [
          createMockZone({
            id: 'zone_aaa',
            floorArea: 40,
            loadResult: { coolingLoad: undefined, heatingLoad: 3000 },
          }),
          createMockZone({
            id: 'zone_bbb',
            floorArea: 20,
            loadResult: { coolingLoad: 2000, heatingLoad: undefined },
          }),
        ]

        const summary = calculateZoneSummary(zones as any)
        expect(summary.totalArea).toBe(60)
        expect(summary.totalCoolingLoad).toBe(2000)
        expect(summary.totalHeatingLoad).toBe(3000)
        expect(summary.zoneCount).toBe(2)
      })
    })
  })

  // ===============================================================
  // 3. formatLoadValue テスト
  // ===============================================================
  describe('formatLoadValue', () => {
    describe('正常系', () => {
      it('TC-009: W を kW に変換して小数点1桁で表示する', () => {
        expect(formatLoadValue(15000)).toBe('15.0kW')
      })

      it('TC-010: 小数点以下が発生する値の変換', () => {
        expect(formatLoadValue(1500)).toBe('1.5kW')
      })
    })

    describe('エッジケース', () => {
      it('TC-011: undefined の場合 "-" を返す', () => {
        expect(formatLoadValue(undefined)).toBe('-')
      })

      it('TC-012: 0W の場合 "0.0kW" を返す', () => {
        expect(formatLoadValue(0)).toBe('0.0kW')
      })
    })
  })

  // ===============================================================
  // 4. formatAreaValue テスト
  // ===============================================================
  describe('formatAreaValue', () => {
    describe('正常系', () => {
      it('TC-013: 面積を小数点1桁 + "m2" で表示する', () => {
        expect(formatAreaValue(50)).toBe('50.0m2')
      })

      it('TC-014: 小数点以下の面積を正しくフォーマットする', () => {
        expect(formatAreaValue(25.75)).toBe('25.8m2')
      })
    })

    describe('エッジケース', () => {
      it('TC-015: 0 の場合 "0.0m2" を返す', () => {
        expect(formatAreaValue(0)).toBe('0.0m2')
      })
    })
  })

  // ===============================================================
  // 5. ZONE_USAGE_LABELS テスト
  // ===============================================================
  describe('ZONE_USAGE_LABELS', () => {
    it('TC-016: 全11種の ZoneUsage に日本語ラベルが定義されている', () => {
      expect(ZONE_USAGE_LABELS).toEqual({
        office: '事務所',
        meeting: '会議室',
        server_room: 'サーバー室',
        lobby: 'ロビー',
        corridor: '廊下',
        toilet: 'トイレ',
        kitchen: '厨房',
        warehouse: '倉庫',
        mechanical_room: '機械室',
        electrical_room: '電気室',
        other: 'その他',
      })
    })

    it('TC-017: ZoneUsage の全キーが ZONE_USAGE_LABELS に存在する', () => {
      const expectedKeys = [
        'office',
        'meeting',
        'server_room',
        'lobby',
        'corridor',
        'toilet',
        'kitchen',
        'warehouse',
        'mechanical_room',
        'electrical_room',
        'other',
      ]
      const labelKeys = Object.keys(ZONE_USAGE_LABELS)
      for (const key of expectedKeys) {
        expect(labelKeys).toContain(key)
      }
      expect(labelKeys).toHaveLength(11)
    })
  })
})
