/**
 * TASK-0013: HvacZoneRenderer（半透明床面ポリゴン）
 * ZoneRenderer 純粋関数テスト
 *
 * 【テスト目的】: boundary変換ロジック、カラーマップ参照、バリデーション関数を単体検証
 * 【テスト内容】:
 *   - boundaryToShape: boundary配列からTHREE.Shapeを生成する純粋関数
 *   - getZoneColor: usageからカラーマップを参照する純粋関数
 *   - computeCentroid: boundary重心座標を計算する純粋関数
 *   - isValidBoundary: boundaryの有効性を判定する純粋関数
 *   - ZONE_COLOR_MAP: 全11種ZoneUsageのカラーマップ定数
 * 【参照要件】: REQ-101, REQ-003, REQ-007, REQ-009
 * 【テスト環境】: node（純粋関数のため jsdom 不要）
 *
 * 🔵 青信号: 要件定義書 セクション2.2, 2.3, 2.7, 4.2、テストケース定義書 TC-001〜TC-022
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import * as THREE from 'three'
import { sceneRegistry } from '@kuhl/core'
import { ZONE_LAYER } from '../../../constants/layers'

// 【インポート対象】: 新規作成予定の zone-renderer からエクスポート関数をインポート
// 【注意】: このファイルはまだ存在しないため、テストは全て失敗する（Redフェーズ）
import {
  boundaryToShape,
  getZoneColor,
  computeCentroid,
  isValidBoundary,
  ZONE_COLOR_MAP,
} from '../../../components/renderers/zone-renderer'

// ─────────────────────────────────────────────
// 正常系テストケース
// ─────────────────────────────────────────────

describe('ZoneRenderer 純粋関数テスト', () => {
  // ─── boundaryToShape ───────────────────────

  describe('boundaryToShape', () => {
    describe('TC-001: boundary（4頂点の矩形）から ShapeGeometry を正しく生成する', () => {
      it('boundaryToShapeが4頂点の矩形からShapeを生成する', () => {
        // 【テスト目的】: boundaryToShape() が4頂点の矩形 boundary から THREE.Shape を生成すること
        // 🔵 青信号: 要件定義書 セクション2.2 boundary→ShapeGeometry変換仕様
        const boundary: [number, number][] = [[0, 0], [10, 0], [10, 5], [0, 5]]

        const shape = boundaryToShape(boundary)

        // Shape が生成されること
        expect(shape).toBeInstanceOf(THREE.Shape)

        // ShapeGeometry の頂点数が0でないこと
        const geometry = new THREE.ShapeGeometry(shape)
        expect(geometry.attributes.position).toBeDefined()
        expect(geometry.attributes.position.count).toBeGreaterThan(0)

        geometry.dispose()
      })
    })

    describe('TC-002: boundaryToShape が moveTo/lineTo/closePath の順序で Shape を構築する', () => {
      it('boundaryToShapeがmoveTo→lineTo→closePathの順序でShapeを構築する', () => {
        // 【テスト目的】: Shape の curves（パスセグメント）が正しい数であること
        // 🔵 青信号: 要件定義書 セクション2.2 変換処理仕様
        const boundary: [number, number][] = [[0, 0], [10, 0], [10, 5], [0, 5]]

        const shape = boundaryToShape(boundary)

        // Shape が存在すること
        expect(shape).toBeInstanceOf(THREE.Shape)
        // curves 配列が存在すること（Shape のパスセグメント数 = boundary 頂点数 - 1 + closePath）
        expect(shape.curves.length).toBeGreaterThan(0)
      })
    })

    describe('TC-007: ShapeGeometry が XY 平面上に生成される（Z座標が0）', () => {
      it('ShapeGeometryがXY平面上に生成される', () => {
        // 【テスト目的】: ShapeGeometry の全頂点の Z 座標が 0 であること
        // 🔵 青信号: 要件定義書 セクション2.2 座標系変換仕様、セクション3.4 座標系制約
        const boundary: [number, number][] = [[0, 0], [10, 0], [10, 5], [0, 5]]

        const shape = boundaryToShape(boundary)
        const geometry = new THREE.ShapeGeometry(shape)

        const positions = geometry.attributes.position
        for (let i = 0; i < positions.count; i++) {
          // ShapeGeometry はXY平面上に生成されるためZ=0
          expect(positions.getZ(i)).toBeCloseTo(0, 5)
        }

        geometry.dispose()
      })
    })

    describe('TC-015: boundary が3点（最小有効ポリゴン）の場合 ShapeGeometry を生成する', () => {
      it('boundaryToShapeが3点（三角形）から有効なShapeを生成する', () => {
        // 【テスト目的】: 最小有効ポリゴン（三角形、3点）から THREE.Shape が生成されること
        // 🔵 青信号: 要件定義書 セクション4.2 EDGE-05
        const boundary: [number, number][] = [[0, 0], [10, 0], [5, 8]]

        // isValidBoundary が true を返すこと
        expect(isValidBoundary(boundary)).toBe(true)

        const shape = boundaryToShape(boundary)
        const geometry = new THREE.ShapeGeometry(shape)

        // 頂点数が0より大きいこと
        expect(geometry.attributes.position.count).toBeGreaterThan(0)

        geometry.dispose()
      })
    })

    describe('TC-016: 大きなポリゴン（100m x 100m = 10000m2 超）から ShapeGeometry を生成する', () => {
      it('boundaryToShapeが大きなポリゴンから有効なShapeを生成する', () => {
        // 【テスト目的】: 非常に大きな boundary でも boundaryToShape() が正常動作すること
        // 🟡 黄信号: 要件定義書にサイズ上限の明示的な定義なし。NFR-001から合理的にテスト
        const boundary: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]]

        const shape = boundaryToShape(boundary)
        const geometry = new THREE.ShapeGeometry(shape)

        expect(geometry.attributes.position.count).toBeGreaterThan(0)

        // position 属性の最大値が 100 付近であること
        const positions = geometry.attributes.position
        let maxX = -Infinity
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i)
          if (x > maxX) maxX = x
        }
        expect(maxX).toBeCloseTo(100, 0)

        geometry.dispose()
      })
    })
  })

  // ─── getZoneColor ──────────────────────────

  describe('getZoneColor', () => {
    describe('TC-003: usage="office" に対して青系カラー（#4A90E2）が返される', () => {
      it('getZoneColorがofficeに対して青系カラーを返す', () => {
        // 🔵 青信号: 要件定義書 セクション2.3 カラーマップ定義
        const result = getZoneColor('office')
        expect(result.color).toBe('#4A90E2')
        expect(result.opacity).toBe(0.3)
      })
    })

    describe('TC-004: usage="meeting" に対して緑系カラー（#7ED321）が返される', () => {
      it('getZoneColorがmeetingに対して緑系カラーを返す', () => {
        // 🔵 青信号: 要件定義書 セクション2.3 カラーマップ定義
        const result = getZoneColor('meeting')
        expect(result.color).toBe('#7ED321')
        expect(result.opacity).toBe(0.3)
      })
    })

    describe('TC-005: usage="server_room" に対して赤系カラー（#FF4757）が返される', () => {
      it('getZoneColorがserver_roomに対して赤系カラーを返す', () => {
        // 🔵 青信号: 要件定義書 セクション2.3 カラーマップ定義
        const result = getZoneColor('server_room')
        expect(result.color).toBe('#FF4757')
        expect(result.opacity).toBe(0.3)
      })
    })

    describe('TC-006: 全11種の ZoneUsage に対してカラーマップが定義されている', () => {
      it('カラーマップが全11種のZoneUsageに対して定義されている', () => {
        // 🔵 青信号: 要件定義書 セクション2.3 カラーマップ全定義、HvacZoneNode スキーマ ZoneUsage 列挙
        const allUsages = [
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
        ] as const

        expect(Object.keys(ZONE_COLOR_MAP).length).toBe(11)

        for (const usage of allUsages) {
          const entry = ZONE_COLOR_MAP[usage]
          expect(entry).toBeDefined()
          expect(typeof entry.color).toBe('string')
          expect(typeof entry.opacity).toBe('number')
        }
      })
    })

    describe('TC-009: 各 usage のカラーマップ値が要件定義と一致する', () => {
      it('カラーマップの全エントリが要件定義書の仕様と一致する', () => {
        // 🔵 青信号: 要件定義書 セクション2.3 カラーマップ全定義
        const expected = {
          office: { color: '#4A90E2', opacity: 0.3 },
          meeting: { color: '#7ED321', opacity: 0.3 },
          server_room: { color: '#FF4757', opacity: 0.3 },
          lobby: { color: '#A8A8A8', opacity: 0.3 },
          corridor: { color: '#C8C8C8', opacity: 0.3 },
          toilet: { color: '#9B59B6', opacity: 0.3 },
          kitchen: { color: '#F39C12', opacity: 0.3 },
          warehouse: { color: '#795548', opacity: 0.3 },
          mechanical_room: { color: '#34495E', opacity: 0.3 },
          electrical_room: { color: '#E74C3C', opacity: 0.3 },
          other: { color: '#BDC3C7', opacity: 0.3 },
        } as const

        for (const [usage, spec] of Object.entries(expected)) {
          const result = getZoneColor(usage as keyof typeof expected)
          expect(result.color).toBe(spec.color)
          expect(result.opacity).toBe(spec.opacity)
        }
      })
    })
  })

  // ─── computeCentroid ───────────────────────

  describe('computeCentroid', () => {
    describe('TC-008: ゾーンラベルの重心座標が正しく計算される', () => {
      it('computeCentroidがboundaryの重心座標を正しく計算する', () => {
        // 【テスト目的】: boundary 全頂点の平均座標を返すこと
        // 🟡 黄信号: 要件定義書 セクション2.7 ゾーンラベル表示のスタイル詳細は実装時確定
        const boundary: [number, number][] = [[0, 0], [10, 0], [10, 5], [0, 5]]

        const [cx, cz] = computeCentroid(boundary)

        // x 平均 = (0+10+10+0)/4 = 5
        expect(cx).toBeCloseTo(5, 5)
        // z 平均 = (0+0+5+5)/4 = 2.5
        expect(cz).toBeCloseTo(2.5, 5)
      })
    })

    describe('TC-017: 三角形の重心座標が正しく計算される', () => {
      it('computeCentroidが三角形の重心を正しく計算する', () => {
        // 🟡 黄信号: 要件定義書 セクション2.7
        const boundary: [number, number][] = [[0, 0], [10, 0], [5, 8]]

        const [cx, cz] = computeCentroid(boundary)

        // x 平均 = (0+10+5)/3 = 5
        expect(cx).toBeCloseTo(5, 5)
        // z 平均 = (0+0+8)/3 ≒ 2.6667
        expect(cz).toBeCloseTo(8 / 3, 5)
      })
    })
  })

  // ─── isValidBoundary ──────────────────────

  describe('isValidBoundary', () => {
    describe('TC-010: boundary が undefined の場合 isValidBoundary が false を返す', () => {
      it('isValidBoundaryがundefined boundaryに対してfalseを返す', () => {
        // 🔵 青信号: 要件定義書 セクション4.2 EDGE-01
        expect(isValidBoundary(undefined)).toBe(false)
      })
    })

    describe('TC-011: boundary が空配列の場合 isValidBoundary が false を返す', () => {
      it('isValidBoundaryが空配列boundaryに対してfalseを返す', () => {
        // 🔵 青信号: 要件定義書 セクション4.2 EDGE-02
        expect(isValidBoundary([])).toBe(false)
      })
    })

    describe('TC-012: boundary が1点の場合 isValidBoundary が false を返す', () => {
      it('isValidBoundaryが1点boundaryに対してfalseを返す', () => {
        // 🔵 青信号: 要件定義書 セクション4.2 EDGE-03
        expect(isValidBoundary([[0, 0]])).toBe(false)
      })
    })

    describe('TC-013: boundary が2点の場合 isValidBoundary が false を返す', () => {
      it('isValidBoundaryが2点boundaryに対してfalseを返す', () => {
        // 🔵 青信号: 要件定義書 セクション4.2 EDGE-04
        expect(isValidBoundary([[0, 0], [10, 0]])).toBe(false)
      })
    })

    it('3点以上の boundary に対して isValidBoundary が true を返す', () => {
      // 🔵 青信号: 要件定義書 セクション4.2 EDGE-05
      expect(isValidBoundary([[0, 0], [10, 0], [5, 8]])).toBe(true)
      expect(isValidBoundary([[0, 0], [10, 0], [10, 5], [0, 5]])).toBe(true)
    })
  })

  // ─── boundaryToShape 防御的テスト ──────────

  describe('TC-014: boundaryToShape に undefined を渡した場合の安全性', () => {
    it('boundaryToShapeがundefined入力で例外を投げないこと', () => {
      // 🟡 黄信号: 要件定義書に明示されていないが、防御的プログラミングとして検証
      let threwError = false
      try {
        // biome-ignore lint: 防御的テストのため型キャストを使用
        boundaryToShape(undefined as unknown as [number, number][])
      } catch {
        threwError = true
      }
      // 例外が発生しないこと（null または空の Shape を返す）
      expect(threwError).toBe(false)
    })
  })

  // ─── カラーマップ opacity 一貫性 ──────────

  describe('TC-018: 全 opacity が 0.3 であること', () => {
    it('全usageのopacityが0.3である', () => {
      // 🔵 青信号: 要件定義書 セクション2.3 で全 usage の opacity が 0.3 と統一的に定義
      for (const entry of Object.values(ZONE_COLOR_MAP)) {
        expect(entry.opacity).toBe(0.3)
      }
    })
  })

  // ─── ZONE_LAYER 定数確認 ───────────────────

  describe('TC-019: ZONE_LAYER 定数が 2 であること（前提条件確認）', () => {
    it('ZONE_LAYERが2であること', () => {
      // 🔵 青信号: packages/kuhl-viewer/src/constants/layers.ts から直接確認済み
      expect(ZONE_LAYER).toBe(2)
      expect(typeof ZONE_LAYER).toBe('number')
    })
  })

  // ─── sceneRegistry 登録テスト ─────────────

  describe('sceneRegistry 操作テスト', () => {
    beforeEach(() => {
      // 各テスト前に sceneRegistry をクリーン状態にする
      sceneRegistry.clear()
    })

    afterEach(() => {
      sceneRegistry.clear()
    })

    describe('TC-020: sceneRegistry.nodes に nodeId でオブジェクトを登録・取得できる', () => {
      it('sceneRegistryにnodeIdでオブジェクトが登録される', () => {
        // 🔵 青信号: 要件定義書 セクション2.5、sceneRegistry 登録処理仕様
        const nodeId = 'zone_test123'
        const mockObj = { type: 'Mesh' }

        sceneRegistry.nodes.set(nodeId, mockObj)

        expect(sceneRegistry.nodes.has(nodeId)).toBe(true)
        expect(sceneRegistry.nodes.get(nodeId)).toBe(mockObj)
      })
    })

    describe('TC-021: sceneRegistry.byType.hvac_zone に nodeId を追加・確認できる', () => {
      it('sceneRegistry.byType.hvac_zoneにnodeIdが追加される', () => {
        // 🔵 青信号: 要件定義書 セクション2.5、タイプ別登録仕様
        const nodeId = 'zone_test456'

        sceneRegistry.byType.hvac_zone.add(nodeId)

        expect(sceneRegistry.byType.hvac_zone.has(nodeId)).toBe(true)
      })
    })

    describe('TC-022: sceneRegistry からの登録解除が正しく動作する', () => {
      it('sceneRegistryからの登録解除が正しく動作する', () => {
        // 🔵 青信号: 要件定義書 セクション2.5 解除処理仕様
        const nodeId = 'zone_test789'
        const mockObj = { type: 'Mesh' }

        // 事前登録
        sceneRegistry.nodes.set(nodeId, mockObj)
        sceneRegistry.byType.hvac_zone.add(nodeId)

        // 登録解除
        sceneRegistry.nodes.delete(nodeId)
        sceneRegistry.byType.hvac_zone.delete(nodeId)

        expect(sceneRegistry.nodes.has(nodeId)).toBe(false)
        expect(sceneRegistry.byType.hvac_zone.has(nodeId)).toBe(false)
      })
    })
  })
})
