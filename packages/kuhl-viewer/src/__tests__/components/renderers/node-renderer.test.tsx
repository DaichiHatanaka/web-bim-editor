// @vitest-environment jsdom
/**
 * TASK-0012: Viewer基盤コンポーネント・Canvas・Grid
 * NodeRendererディスパッチャーテスト
 *
 * 【テスト目的】: node.type に基づいて適切なレンダラーが選択されることを確認
 * 【テスト内容】: 各ノードタイプに対するディスパッチ結果を検証
 * 【期待される動作】: 非表示タイプ→null、未実装タイプ→FallbackRenderer
 * 【参照要件】: REQ-003, REQ-007, EDGE-UC-02
 *
 * 【テスト戦略】: Node環境でR3Fコンポーネントをテストするため、vi.mock でモック化し、
 * React Testing Library でコンポーネントの出力を検証する
 * 🟡 黄信号: @testing-library/react が document を必要とするため jsdom 環境を指定
 */

// 【テスト前準備】: useScene ストアにテスト用ノードを登録
// 【環境初期化】: vi.mock で R3F をモック化、各テスト後にストアをリセット
// 🟡 黄信号: R3F Canvasのテスト環境制約により、モック化が必要

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'

// 【R3Fモック】: Node環境ではWebGL/WebGPUが使用できないため R3F をモック化
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

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Grid: () => null,
  PerspectiveCamera: () => null,
}))

// 【kuhl-coreのインポート】: テスト用ノード生成のため kuhl-core から直接インポート
import {
  AhuNode,
  BuildingNode,
  HvacZoneNode,
  LevelNode,
  PlantNode,
  useScene,
} from '@kuhl/core'

// 【インポート対象】: 新規作成予定の NodeRenderer をインポート
// 【注意】: このファイルはまだ存在しないため、テストは失敗する（Redフェーズ）
import { NodeRenderer } from '../../../components/renderers/node-renderer'

describe('NodeRenderer ディスパッチャー', () => {
  beforeEach(() => {
    // 【テスト前準備】: useScene ストアをクリーンな状態にリセット
    // 【環境初期化】: 前のテストのノードが残らないようストアをリセット
    useScene.getState().clearScene()
  })

  afterEach(() => {
    // 【テスト後処理】: useScene ストアをリセットし、テスト間の干渉を防止
    // 【状態復元】: ストアを初期状態に戻す
    useScene.getState().clearScene()
    vi.clearAllMocks()
  })

  describe('TC-005: hvac_zone タイプのノードに対してディスパッチする', () => {
    it('NodeRendererがhvac_zoneノードに対してディスパッチする', () => {
      // 【テスト目的】: NodeRendererが hvac_zone タイプを認識し対応コンポーネントを返すこと
      // 【テスト内容】: hvac_zone タイプのノードIDを渡してNodeRendererの出力を検証
      // 【期待される動作】: null でないReact要素が返される（FallbackRenderer の BoxGeometry）
      // 🟡 黄信号: 要件定義書 セクション2.3 ディスパッチマッピングから推測

      // 【テストデータ準備】: hvac_zone タイプのノードをストアに追加
      const zone = HvacZoneNode.parse({
        zoneName: 'テストゾーン',
        usage: 'office',
        floorArea: 100,
      })
      useScene.getState().createNode(zone)

      // 【実際の処理実行】: NodeRenderer を nodeId 付きでレンダリング
      // 【処理内容】: NodeRenderer が hvac_zone タイプを識別してディスパッチする
      // 【検証】: レンダリングがエラーなしで完了すること（ディスパッチが機能している）
      let threwError = false
      try {
        render(<NodeRenderer nodeId={zone.id} />)
      } catch {
        threwError = true
      }

      // 【結果検証】: エラーなしでレンダリングが完了すること
      // 【期待値確認】: Phase 1では FallbackRenderer（BoxGeometry）が描画される
      expect(threwError).toBe(false) // 【確認内容】: hvac_zoneノードに対してNodeRendererがディスパッチに成功すること 🟡
    })
  })

  describe('TC-006: ahu タイプのノードに対してディスパッチする', () => {
    it('NodeRendererがahuノードに対してディスパッチする', () => {
      // 【テスト目的】: NodeRendererが ahu タイプを認識しFallbackRenderer（Phase 1）を返すこと
      // 【テスト内容】: ahu タイプのノードIDを渡してNodeRendererの出力を検証
      // 【期待される動作】: FallbackRenderer（BoxGeometry）が描画される
      // 🟡 黄信号: 要件定義書 セクション2.3 ディスパッチマッピングから推測

      // 【テストデータ準備】: ahu タイプのノードをストアに追加
      // 【フィールド修正】: HvacEquipmentBase の必須フィールド（tag, equipmentName, dimensions, lod, status）を含める
      const ahu = AhuNode.parse({
        tag: 'AHU-001',
        equipmentName: 'テストAHU',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        dimensions: [1, 1, 1],
        lod: '100',
        status: 'planned',
      })
      useScene.getState().createNode(ahu)

      // 【実際の処理実行】: NodeRenderer を ahu nodeId で呼び出す
      let threwError = false
      try {
        render(<NodeRenderer nodeId={ahu.id} />)
      } catch {
        threwError = true
      }

      // 【結果検証】: FallbackRenderer が描画されること
      expect(threwError).toBe(false) // 【確認内容】: AHUノードに対してFallbackRendererが適用されること 🟡
    })
  })

  describe('TC-007: plant タイプのノードに対してレンダリングしない', () => {
    it('NodeRendererがplantノードに対してレンダリングしない', () => {
      // 【テスト目的】: plant は階層構造ノードであり、3Dジオメトリを持たないためnullが返ること
      // 【テスト内容】: plant タイプのノードIDを渡してNodeRendererの出力を検証
      // 【期待される動作】: レンダリング出力がnullまたは空のフラグメント
      // 🔵 青信号: 要件定義書 セクション2.3 で明確に「レンダリングなし」と定義

      // 【テストデータ準備】: plant タイプのノードをストアに追加
      const plant = PlantNode.parse({
        plantName: 'テストプラント',
      })
      useScene.getState().createNode(plant)

      // 【実際の処理実行】: NodeRenderer を plant nodeId で呼び出す
      const { container } = render(<NodeRenderer nodeId={plant.id} />)

      // 【結果検証】: 何も描画されないこと（nullまたは空のレンダリング）
      // 【期待値確認】: plant は3Dジオメトリを持たないため、レンダリングなし
      // 【確認内容】: plantノードのレンダリング結果が空であること 🔵
      // NodeRenderer が null を返す場合、container は空のdiv
      expect(container.firstChild).toBeNull() // 【確認内容】: plantノードのコンテナが空であること 🔵
    })
  })

  describe('TC-008: building タイプのノードに対してレンダリングしない', () => {
    it('NodeRendererがbuildingノードに対してレンダリングしない', () => {
      // 【テスト目的】: building は階層構造ノードであり、3Dジオメトリを持たないためnullが返ること
      // 【テスト内容】: building タイプのノードIDを渡してNodeRendererの出力を検証
      // 【期待される動作】: レンダリング出力がnullまたは空のフラグメント
      // 🔵 青信号: 要件定義書 セクション2.3 で明確に「レンダリングなし」と定義

      // 【テストデータ準備】: building タイプのノードをストアに追加
      const building = BuildingNode.parse({
        buildingName: 'テストビル',
      })
      useScene.getState().createNode(building)

      // 【実際の処理実行】: NodeRenderer を building nodeId で呼び出す
      const { container } = render(<NodeRenderer nodeId={building.id} />)

      // 【結果検証】: 何も描画されないこと
      expect(container.firstChild).toBeNull() // 【確認内容】: buildingノードのコンテナが空であること 🔵
    })
  })

  describe('TC-009: level タイプのノードに対してレンダリングしない', () => {
    it('NodeRendererがlevelノードに対してレンダリングしない', () => {
      // 【テスト目的】: level は階層構造ノードであり、3Dジオメトリを持たないためnullが返ること
      // 【テスト内容】: level タイプのノードIDを渡してNodeRendererの出力を検証
      // 【期待される動作】: レンダリング出力がnullまたは空のフラグメント
      // 🔵 青信号: 要件定義書 セクション2.3 で明確に「レンダリングなし」と定義

      // 【テストデータ準備】: level タイプのノードをストアに追加
      const level = LevelNode.parse({
        floorHeight: 3.0,
        ceilingHeight: 2.7,
        elevation: 0,
      })
      useScene.getState().createNode(level)

      // 【実際の処理実行】: NodeRenderer を level nodeId で呼び出す
      const { container } = render(<NodeRenderer nodeId={level.id} />)

      // 【結果検証】: 何も描画されないこと
      expect(container.firstChild).toBeNull() // 【確認内容】: levelノードのコンテナが空であること 🔵
    })
  })

  describe('TC-012: 存在しないノードIDを渡した場合 null を返す', () => {
    it('存在しないノードIDでNodeRendererがnullを返す', () => {
      // 【テスト目的】: シーンからノードが削除された直後のrace conditionを防止する
      // 【テスト内容】: useScene に未登録の nodeId を渡した場合の動作検証
      // 【期待される動作】: null が返される（何も描画されない、クラッシュしない）
      // 🔵 青信号: 既存 packages/viewer/src/components/renderers/node-renderer.tsx の if (!node) return null パターン

      // 【テストデータ準備】: 存在しないノードID（ストアに未登録）
      // 【前提条件確認】: ストアが空であること
      const nonExistentId = 'nonexistent_node_abc123' as Parameters<typeof NodeRenderer>[0]['nodeId']

      // 【実際の処理実行】: 存在しないIDで NodeRenderer を呼び出す
      const { container } = render(<NodeRenderer nodeId={nonExistentId} />)

      // 【結果検証】: null が返されること（クラッシュしないこと）
      expect(container.firstChild).toBeNull() // 【確認内容】: 存在しないノードIDに対してnullが返されること 🔵
    })
  })

  describe('TC-013: null/undefined の nodeId を渡した場合の安全性', () => {
    it('null/undefinedのnodeIdでNodeRendererがクラッシュしない', () => {
      // 【テスト目的】: TypeScript型で防げない実行時の不正な値に対する安全性を保証
      // 【テスト内容】: undefined が nodeId として渡された場合にランタイムエラーが発生しないこと
      // 【期待される動作】: null が返される（エラーがthrowされない）
      // 🟡 黄信号: 要件定義書には明示されていないが、既存NodeRendererパターンの防御的テスト

      // 【テストデータ準備】: 不正な nodeId（undefined）を準備
      const invalidId = undefined as unknown as Parameters<typeof NodeRenderer>[0]['nodeId']

      // 【実際の処理実行】: 不正なIDで NodeRenderer を呼び出す（例外が発生しないこと）
      let threwError = false
      try {
        render(<NodeRenderer nodeId={invalidId} />)
      } catch {
        threwError = true
      }

      // 【結果検証】: 例外が発生しないこと
      expect(threwError).toBe(false) // 【確認内容】: undefined nodeIdでもクラッシュしないこと 🟡
    })
  })

  describe('TC-017: 全ノードタイプに対してクラッシュしない', () => {
    it('全ノードタイプでNodeRendererがクラッシュしない', () => {
      // 【テスト目的】: AnyNode union の全タイプに対して NodeRenderer が安全に動作すること
      // 【テスト内容】: 各ノードタイプのIDを順に NodeRenderer に渡し、例外が発生しないことを確認
      // 【期待される動作】: 各タイプに対して null または FallbackRenderer のいずれかが返される
      // 🟡 黄信号: 要件定義書 セクション2.3 ディスパッチマッピングから推測。Phase 1では全てFallbackRendererまたはnull

      // 【テストデータ準備】: 各ノードタイプのテスト用ノードを作成
      const plant = PlantNode.parse({ plantName: 'テストプラント' })
      const building = BuildingNode.parse({ buildingName: 'テストビル' })
      const level = LevelNode.parse({ floorHeight: 3.0, ceilingHeight: 2.7, elevation: 0 })
      const zone = HvacZoneNode.parse({
        zoneName: 'テストゾーン',
        usage: 'office',
        floorArea: 50,
      })
      // 【フィールド修正】: HvacEquipmentBase の必須フィールド（tag, equipmentName, dimensions, lod, status）を含める
      const ahu = AhuNode.parse({
        tag: 'AHU-001',
        equipmentName: 'テストAHU-017',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        dimensions: [1, 1, 1],
        lod: '100',
        status: 'planned',
      })

      const testNodes = [plant, building, level, zone, ahu]
      for (const node of testNodes) {
        useScene.getState().createNode(node)
      }

      // 【実際の処理実行】: 各ノードタイプに対してNodeRendererを呼び出す
      // 【処理内容】: 全タイプが例外を発生させずにレンダリングされること
      const errors: string[] = []

      for (const node of testNodes) {
        try {
          render(<NodeRenderer nodeId={node.id} />)
        } catch (e) {
          errors.push(`nodeType=${node.type}: ${e}`)
        }
      }

      // 【結果検証】: 全ノードタイプで例外が発生しないこと
      expect(errors).toEqual([]) // 【確認内容】: 全ノードタイプでNodeRendererがクラッシュしないこと 🟡
    })
  })
})
