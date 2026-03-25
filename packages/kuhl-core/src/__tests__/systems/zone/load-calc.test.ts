/**
 * TC-001 〜 TC-016: calculateZoneLoad 純粋関数のユニットテスト
 *
 * Red Phase: 実装ファイル (systems/zone/load-calc.ts) が存在しないため
 * import 時点でモジュール解決エラーが発生し、全テストが失敗する。
 */

import { afterEach, describe, expect, it } from 'vitest'
import { HvacZoneNode } from '../../../schema/nodes/hvac-zone'
import type { ZoneUsage } from '../../../schema/nodes/hvac-zone'
import useScene, { clearSceneHistory } from '../../../store/use-scene'
// ↓ 実装ファイルが存在しないため、ここで Cannot find module エラーが発生する（Red Phase 意図的）
import {
  LOAD_INTENSITY_TABLE,
  ORIENTATION_FACTORS,
  calculateZoneLoad,
  getGlazingFactor,
  getOrientationFactor,
} from '../../../systems/zone/load-calc'

// -----------------------------------------------------------------
// Orientation 型定義（Green Phase でスキーマに追加される）
// Red Phase では `as any` でキャストして HvacZoneNode.parse に渡す
// -----------------------------------------------------------------
type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

/**
 * createTestZone ヘルパー
 * orientation / glazingRatio は Green Phase でスキーマ追加されるオプショナルフィールド。
 * Red Phase では `as any` でキャストして渡す。
 */
function createTestZone(
  overrides: Partial<{
    zoneName: string
    usage: ZoneUsage
    floorArea: number
    orientation: Orientation
    glazingRatio: number
    designConditions: Partial<{
      summerDryBulb: number
      winterDryBulb: number
    }>
  }> = {},
) {
  return HvacZoneNode.parse({
    zoneName: overrides.zoneName ?? 'Test Zone',
    usage: overrides.usage ?? 'office',
    floorArea: overrides.floorArea ?? 100,
    ...(overrides.orientation !== undefined && { orientation: overrides.orientation }),
    ...(overrides.glazingRatio !== undefined && { glazingRatio: overrides.glazingRatio }),
    ...(overrides.designConditions && { designConditions: overrides.designConditions }),
  } as any)
}

// =================================================================
// calculateZoneLoad テスト
// =================================================================

describe('calculateZoneLoad', () => {
  // ---------------------------------------------------------------
  // TC-001: office 用途の冷暖房負荷計算
  // ---------------------------------------------------------------
  describe('basic calculation', () => {
    it('TC-001: office 100m² の冷暖房負荷と必要給気量が正しく計算される', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      // 150 W/m² × 100 m² = 15000 W
      expect(result!.coolingLoad).toBe(15000)
      // 100 W/m² × 100 m² = 10000 W
      expect(result!.heatingLoad).toBe(10000)
      // 正の値
      expect(result!.requiredAirflow).toBeGreaterThan(0)
      // requiredAirflow = 15000 / (1.2 × 1006 × (26 - 15)) × 3600 ≈ 4066.5
      expect(result!.requiredAirflow).toBeCloseTo(4066.5, 1)
    })
  })

  // ---------------------------------------------------------------
  // TC-002: 全11種の usage 別原単位テーブル正確性
  // ---------------------------------------------------------------
  describe('usage unit table', () => {
    it.each([
      ['office', 15000, 10000],
      ['meeting', 18000, 12000],
      ['server_room', 30000, 5000],
      ['lobby', 12000, 8000],
      ['corridor', 8000, 6000],
      ['toilet', 10000, 7000],
      ['kitchen', 20000, 13000],
      ['warehouse', 6000, 4000],
      ['mechanical_room', 12000, 8000],
      ['electrical_room', 18000, 11000],
      ['other', 12000, 8000],
    ] as [ZoneUsage, number, number][])(
      'TC-002: usage=%s → coolingLoad=%d, heatingLoad=%d',
      (usage, expectedCooling, expectedHeating) => {
        const zone = createTestZone({ usage, floorArea: 100 })
        const result = calculateZoneLoad(zone)

        expect(result).not.toBeUndefined()
        expect(result!.coolingLoad).toBe(expectedCooling)
        expect(result!.heatingLoad).toBe(expectedHeating)
      },
    )
  })

  // ---------------------------------------------------------------
  // TC-003: 方位補正（S=1.15 適用）
  // ---------------------------------------------------------------
  describe('orientation correction', () => {
    it('TC-003: orientation=S → 冷暖房負荷に 1.15 補正が掛かる', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100, orientation: 'S' })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      // 150 × 100 × 1.15 = 17250
      expect(result!.coolingLoad).toBe(17250)
      // 100 × 100 × 1.15 = 11500
      expect(result!.heatingLoad).toBe(11500)
    })
  })

  // ---------------------------------------------------------------
  // TC-004: ガラス面積補正（glazingRatio=0.5 適用）
  // ---------------------------------------------------------------
  describe('glazing correction', () => {
    it('TC-004: glazingRatio=0.5 → glazingFactor=1.1 が適用される', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100, glazingRatio: 0.5 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      // glazingFactor = 1.0 + (0.5 - 0.3) × 0.5 = 1.1
      // 150 × 100 × 1.0 × 1.1 = 16500
      expect(result!.coolingLoad).toBe(16500)
      // 100 × 100 × 1.0 × 1.1 = 11000
      expect(result!.heatingLoad).toBe(11000)
    })
  })

  // ---------------------------------------------------------------
  // TC-005: 必要給気量計算
  // ---------------------------------------------------------------
  describe('required airflow', () => {
    it('TC-005: office 100m²（summerDryBulb=26 デフォルト）の必要給気量', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      // ΔT = 26 - 15 = 11
      // requiredAirflow = 15000 / (1.2 × 1006 × 11) × 3600 ≈ 4066.5 m³/h
      expect(result!.requiredAirflow).toBeCloseTo(4066.5, 1)
    })
  })

  // ---------------------------------------------------------------
  // TC-006: 方位＋ガラス複合補正
  // ---------------------------------------------------------------
  describe('combined corrections', () => {
    it('TC-006: orientation=S + glazingRatio=0.5 → 複合補正が正しく適用される', () => {
      const zone = createTestZone({
        usage: 'office',
        floorArea: 100,
        orientation: 'S',
        glazingRatio: 0.5,
      })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      // orientationFactor=1.15, glazingFactor=1.1
      // 150 × 100 × 1.15 × 1.1 = 18975
      expect(result!.coolingLoad).toBeCloseTo(18975)
      // 100 × 100 × 1.15 × 1.1 = 12650
      expect(result!.heatingLoad).toBeCloseTo(12650)
    })
  })

  // ---------------------------------------------------------------
  // 異常系テストケース
  // ---------------------------------------------------------------
  describe('edge cases', () => {
    it('TC-008: floorArea=0 → undefined を返す', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 0 })
      const result = calculateZoneLoad(zone)
      expect(result).toBeUndefined()
    })

    it('TC-009: floorArea<0 → undefined を返す（物理的に無効）', () => {
      const zone = createTestZone({ floorArea: -10 })
      const result = calculateZoneLoad(zone)
      expect(result).toBeUndefined()
    })

    it('TC-010: usage 不正値（ランタイム混入）→ office フォールバックまたは undefined', () => {
      // Zodバリデーションをバイパスして不正な usage を注入
      const base = HvacZoneNode.parse({ zoneName: 'Bad Zone', usage: 'office', floorArea: 100 })
      const zone = { ...base, usage: 'invalid_usage' as ZoneUsage }

      const result = calculateZoneLoad(zone)
      if (result !== undefined) {
        // office フォールバックの場合
        expect(result.coolingLoad).toBe(15000)
        expect(result.heatingLoad).toBe(10000)
      } else {
        expect(result).toBeUndefined()
      }
    })

    it('TC-011: designConditions 未指定 → summerDryBulb=26 デフォルトで正常計算', () => {
      // HvacZoneNode.parse が designConditions のデフォルト値を補完する
      const zone = HvacZoneNode.parse({
        zoneName: 'Zone',
        usage: 'office',
        floorArea: 100,
      })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      expect(result!.coolingLoad).toBe(15000)
    })
  })

  // ---------------------------------------------------------------
  // 境界値テストケース
  // ---------------------------------------------------------------
  describe('boundary values', () => {
    it('TC-012: 最小 floorArea=0.01m² → 正常に計算される', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 0.01 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      // 150 × 0.01 = 1.5
      expect(result!.coolingLoad).toBeCloseTo(1.5)
      // 100 × 0.01 = 1.0
      expect(result!.heatingLoad).toBeCloseTo(1.0)
      expect(result!.requiredAirflow).toBeGreaterThan(0)
    })

    it('TC-013: glazingRatio=0 → glazingFactor=1.0（補正なし）', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100, glazingRatio: 0 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      expect(result!.coolingLoad).toBe(15000)
    })

    it('TC-014: glazingRatio=0.3（閾値ちょうど）→ glazingFactor=1.0（> 0.3 を満たさない）', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100, glazingRatio: 0.3 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      expect(result!.coolingLoad).toBe(15000)
    })

    it('TC-015: glazingRatio=1.0（最大）→ glazingFactor=1.35', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100, glazingRatio: 1.0 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      // glazingFactor = 1.0 + (1.0 - 0.3) × 0.5 = 1.35
      // 150 × 100 × 1.35 = 20250
      expect(result!.coolingLoad).toBe(20250)
      // 100 × 100 × 1.35 = 13500
      expect(result!.heatingLoad).toBe(13500)
    })

    it('TC-016: orientation 未定義 → orientationFactor=1.0（補正なし）', () => {
      const zone = createTestZone({ usage: 'office', floorArea: 100 })
      const result = calculateZoneLoad(zone)

      expect(result).not.toBeUndefined()
      expect(result!.coolingLoad).toBe(15000)
    })
  })
})

// =================================================================
// LoadCalcSystem テスト
// =================================================================

describe('LoadCalcSystem', () => {
  afterEach(() => {
    useScene.getState().unloadScene()
    clearSceneHistory()
  })

  // ---------------------------------------------------------------
  // TC-007: dirtyNodes 検出 → 再計算
  // ---------------------------------------------------------------
  describe('dirty node processing', () => {
    it('TC-007: dirtyNodes の hvac_zone ノードを検出し loadResult を更新する', async () => {
      // 実装ファイルが存在しない段階では import 自体が失敗しテストが赤になる
      const { processLoadCalc } = await import('../../../systems/zone/load-calc-system')

      const zone = HvacZoneNode.parse({
        zoneName: 'Office A',
        usage: 'office',
        floorArea: 100,
      })
      useScene.getState().createNode(zone)

      // createNode 後は dirtyNodes に追加される
      expect(useScene.getState().dirtyNodes.has(zone.id)).toBe(true)

      // LoadCalcSystem の useFrame ロジックを直接実行
      processLoadCalc()

      const updatedNode = useScene.getState().nodes[zone.id] as typeof zone
      expect(updatedNode.loadResult).not.toBeUndefined()
      expect(updatedNode.loadResult!.coolingLoad).toBe(15000)
      expect(updatedNode.loadResult!.heatingLoad).toBe(10000)

      // dirtyNodes からノード ID が除去される
      expect(useScene.getState().dirtyNodes.has(zone.id)).toBe(false)
    })
  })
})

// =================================================================
// 定数・ヘルパー関数のエクスポート確認
// =================================================================

describe('LOAD_INTENSITY_TABLE', () => {
  it('11種の ZoneUsage をすべてカバーする', () => {
    const usages: ZoneUsage[] = [
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
    for (const usage of usages) {
      expect(LOAD_INTENSITY_TABLE[usage]).toBeDefined()
      expect(LOAD_INTENSITY_TABLE[usage].cooling).toBeGreaterThan(0)
      expect(LOAD_INTENSITY_TABLE[usage].heating).toBeGreaterThan(0)
    }
  })
})

describe('ORIENTATION_FACTORS', () => {
  it('全方位の補正係数がエクスポートされている', () => {
    const table = ORIENTATION_FACTORS as Record<string, number>
    const directions: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    for (const dir of directions) {
      expect(table[dir]).toBeDefined()
    }
    expect(table['S']).toBe(1.15)
    expect(table['N']).toBe(0.9)
  })
})

describe('getOrientationFactor', () => {
  it('undefined を渡すと 1.0 を返す', () => {
    expect(getOrientationFactor(undefined)).toBe(1.0)
  })

  it('S を渡すと 1.15 を返す', () => {
    expect(getOrientationFactor('S' as Orientation)).toBe(1.15)
  })

  it('N を渡すと 0.90 を返す', () => {
    expect(getOrientationFactor('N' as Orientation)).toBe(0.9)
  })
})

describe('getGlazingFactor', () => {
  it('undefined を渡すと 1.0 を返す', () => {
    expect(getGlazingFactor(undefined)).toBe(1.0)
  })

  it('0.3 以下は 1.0 を返す（0 のケース）', () => {
    expect(getGlazingFactor(0)).toBe(1.0)
  })

  it('0.3 ちょうどは 1.0 を返す（閾値）', () => {
    expect(getGlazingFactor(0.3)).toBe(1.0)
  })

  it('0.5 を渡すと 1.1 を返す', () => {
    expect(getGlazingFactor(0.5)).toBeCloseTo(1.1)
  })

  it('1.0 を渡すと 1.35 を返す', () => {
    expect(getGlazingFactor(1.0)).toBeCloseTo(1.35)
  })
})
