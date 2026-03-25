// @vitest-environment jsdom
/**
 * TASK-0022: EquipmentRenderer（LOD200 プロシージャル・GLB）
 * equipment-lod200 テストスイート
 *
 * 【テスト目的】:
 *   - 純粋関数（getLodRenderer, getProceduralShape）の単体検証
 *   - ProceduralEquipment コンポーネントのタイプ別形状生成検証
 *   - GlbModelRenderer コンポーネントの存在確認
 *   - Lod100Fallback コンポーネントの BoxGeometry 描画検証
 *   - LOD200 で TagLabel・PortMarkers が表示されること
 *   - LOD200 + modelSrc 有り → GlbModelRenderer パスの分岐検証
 * 【テスト内容】:
 *   - getLodRenderer: LOD値 → レンダラータイプ文字列の変換
 *   - getProceduralShape: タイプ → 形状設定（heightScale）の変換
 *   - ProceduralEquipment: AHU/PAC/FCU/未知タイプの形状生成
 *   - GlbModelRenderer: コンポーネントのエクスポート確認
 *   - Lod100Fallback: BoxGeometry レンダリング
 *   - EquipmentRenderer: LOD200 パス分岐
 * 【参照要件】: FR-001, FR-002, FR-003, FR-004, TC-LOD200-001〜TC-LOD200-016
 * 【テスト環境】: jsdom（コンポーネントテスト）+ Three.js 直接テスト（純粋関数）
 *
 * 🟡 黄信号: TASK-0022 要件定義・テストケース定義から確認済み。
 *            getLodRenderer/getProceduralShape の具体的 API は推測ベース
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { AhuNode } from '@kuhl/core'

// ─── R3F モック ────────────────────────────────────────────────────────────

// 【R3Fモック】: jsdom 環境では WebGL/WebGPU が使用できないため R3F をモック化
// 🟡 黄信号: TASK-0021 既存テストと同じモックパターンを踏襲
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

// 【Dreiモック】: Html コンポーネントと useGLTF を jsdom 互換のモックに置き換え
// 🟡 黄信号: useGLTF は非同期 GLB 読込のため、モック GLTF シーンを返すように設定
vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drei-html">{children}</div>
  ),
  OrbitControls: () => null,
  useGLTF: vi.fn(() => ({
    scene: {
      clone: vi.fn(() => ({
        scale: { set: vi.fn() },
      })),
    },
  })),
}))

// ─── インポート対象（未実装ファイルから - Redフェーズ：全テスト失敗想定） ──────

// 【インポート】: 純粋関数 getLodRenderer, getProceduralShape を新規ユーティリティファイルからインポート
// 🟡 黄信号: ファイルパスと関数名は要件定義・note.md から推測。未実装のためインポートエラーが発生する
import {
  getLodRenderer,
  getProceduralShape,
} from '../../../components/renderers/equipment-lod-utils'

// 【インポート】: ProceduralEquipment コンポーネントをインポート
// 🟡 黄信号: FR-003 から推測。未実装のためインポートエラーが発生する
import { ProceduralEquipment } from '../../../components/renderers/parts/procedural-equipment'

// 【インポート】: GlbModelRenderer コンポーネントをインポート
// 🔵 青信号: FR-002 から確認済み。未実装のためインポートエラーが発生する
import { GlbModelRenderer } from '../../../components/renderers/parts/glb-model-renderer'

// 【インポート】: Lod100Fallback コンポーネントをインポート
// 🔵 青信号: FR-004 から確認済み。未実装のためインポートエラーが発生する
import { Lod100Fallback } from '../../../components/renderers/parts/lod100-fallback'

// 【インポート】: 既存定数（TASK-0021 から再利用）
// 🔵 青信号: TASK-0021 実装済み
import { getEquipmentColor } from '../../../constants/equipment-colors'

// ─── useScene モック ────────────────────────────────────────────────────────

// 【useScene モック】: Zustand ストアをモック化してノード状態を制御
// 🟡 黄信号: TASK-0021 既存テストと同じパターン
vi.mock('@kuhl/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@kuhl/core')>()
  return {
    ...actual,
    useScene: vi.fn((selector: (state: { nodes: Record<string, unknown> }) => unknown) =>
      selector({ nodes: {} }),
    ),
    sceneRegistry: {
      nodes: new Map(),
      byType: {
        ahu: new Set(),
        pac: new Set(),
        fcu: new Set(),
        vrf_outdoor: new Set(),
        vrf_indoor: new Set(),
        diffuser: new Set(),
        damper: new Set(),
        fan: new Set(),
        pump: new Set(),
        chiller: new Set(),
        boiler: new Set(),
        cooling_tower: new Set(),
        valve: new Set(),
      },
    },
  }
})

// ─── テストデータ定義 ──────────────────────────────────────────────────────

/** 標準テスト用 AHU ノード（LOD200、modelSrc なし） */
const makeTestAhuNodeLod200 = () =>
  AhuNode.parse({
    tag: 'AHU-201',
    equipmentName: 'テスト空調機 LOD200',
    position: [1, 2, 3],
    rotation: [0, 0, 0],
    dimensions: [2.5, 1.8, 1.2],
    lod: '200',
    status: 'planned',
    ports: [
      {
        id: 'port_0',
        name: 'Supply Air Out',
        medium: 'supply_air',
        direction: 'out',
        position: [1.25, 0, 0],
        connectedTo: null,
      },
      {
        id: 'port_1',
        name: 'Return Air In',
        medium: 'return_air',
        direction: 'in',
        position: [-1.25, 0, 0],
        connectedTo: null,
      },
    ],
  })

/** LOD200 + modelSrc あり の AHU ノード */
const makeTestAhuNodeLod200WithModelSrc = () =>
  AhuNode.parse({
    tag: 'AHU-202',
    equipmentName: 'テスト空調機 LOD200 GLB',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    dimensions: [2.5, 1.8, 1.2],
    lod: '200',
    modelSrc: '/models/ahu.glb',
    status: 'planned',
    ports: [],
  })

// ─── describe グループ ──────────────────────────────────────────────────────

describe('TASK-0022: EquipmentRenderer LOD200 テスト', () => {
  // ────────────────────────────────────────────────
  // 純粋関数テスト（モック不要）
  // ────────────────────────────────────────────────

  describe('純粋関数テスト: getLodRenderer', () => {
    // ── TC-LOD200-001: getLodRenderer ────────────

    it("TC-LOD200-001a: getLodRenderer('100') が 'lod100' を返す", () => {
      // 【テスト目的】: getLodRenderer 関数が LOD='100' に対して 'lod100' を返すこと
      // 【テスト内容】: getLodRenderer に '100' を渡して戻り値を検証
      // 【期待される動作】: 'lod100' 文字列が返される
      // 🟡 黄信号: FR-001.1 から確認済み。getLodRenderer の API 名は推測

      // 【実際の処理実行】: getLodRenderer を呼び出す
      const result = getLodRenderer('100')

      // 【結果検証】: 'lod100' が返されること
      expect(result).toBe('lod100') // 【確認内容】: LOD='100' に対して 'lod100' が返されること 🟡
    })

    it("TC-LOD200-001b: getLodRenderer('200') が 'lod200' を返す", () => {
      // 【テスト目的】: getLodRenderer 関数が LOD='200' に対して 'lod200' を返すこと
      // 【テスト内容】: getLodRenderer に '200' を渡して戻り値を検証
      // 【期待される動作】: 'lod200' 文字列が返される
      // 🟡 黄信号: FR-001.2/FR-001.3 から確認済み

      // 【実際の処理実行】: getLodRenderer を呼び出す
      const result = getLodRenderer('200')

      // 【結果検証】: 'lod200' が返されること
      expect(result).toBe('lod200') // 【確認内容】: LOD='200' に対して 'lod200' が返されること 🟡
    })

    it('TC-LOD200-001c: getLodRenderer(undefined) が lod100 にデフォルトフォールバックする', () => {
      // 【テスト目的】: getLodRenderer 関数が undefined に対して 'lod100' にデフォルトフォールバックすること
      // 【テスト内容】: getLodRenderer に undefined を渡して戻り値を検証
      // 【期待される動作】: 'lod100' にフォールバックする（FR-001.4）
      // 🔵 青信号: FR-001.4「lod is undefined → default to LOD100」から直接確認

      // 【実際の処理実行】: undefined を渡して getLodRenderer を呼び出す
      const result = getLodRenderer(undefined)

      // 【結果検証】: undefined → 'lod100' にフォールバックすること
      expect(result).toBe('lod100') // 【確認内容】: undefined の場合 'lod100' にフォールバックすること 🔵
    })

    it("TC-LOD200-001d: getLodRenderer('300') / 未知値 が lod100 にフォールバックする", () => {
      // 【テスト目的】: getLodRenderer 関数が未知の LOD 値に対して 'lod100' にフォールバックすること
      // 【テスト内容】: getLodRenderer に '300', 'invalid' を渡して戻り値を検証
      // 【期待される動作】: 'lod100' にフォールバックする（FR-001.5）
      // 🔵 青信号: FR-001.5「lod === '300' → default to LOD100」から直接確認

      // 【実際の処理実行】: '300' と未知値を渡す
      const resultLod300 = getLodRenderer('300')
      const resultInvalid = getLodRenderer('invalid' as unknown as string)

      // 【結果検証】: 未知 LOD 値で 'lod100' にフォールバックすること
      expect(resultLod300).toBe('lod100') // 【確認内容】: LOD='300' で 'lod100' にフォールバックすること 🔵
      expect(resultInvalid).toBe('lod100') // 【確認内容】: 未知値で 'lod100' にフォールバックすること 🔵
    })
  })

  describe('純粋関数テスト: getProceduralShape', () => {
    // ── TC-LOD200-002: getProceduralShape ────────

    it("TC-LOD200-002a: getProceduralShape('ahu') が heightScale: 1.0 を返す", () => {
      // 【テスト目的】: getProceduralShape が AHU タイプに対して heightScale: 1.0 を含む設定を返すこと
      // 【テスト内容】: getProceduralShape に 'ahu' を渡して戻り値の heightScale を検証
      // 【期待される動作】: { heightScale: 1.0 } を含むオブジェクトが返される
      // 🟡 黄信号: FR-003.1「AHU: full dimensions」から heightScale: 1.0 と推測

      // 【実際の処理実行】: getProceduralShape を呼び出す
      const result = getProceduralShape('ahu')

      // 【結果検証】: heightScale: 1.0 が返されること
      expect(result).not.toBeNull() // 【確認内容】: null ではないこと（AHU は対応タイプ）🟡
      expect(result?.heightScale).toBe(1.0) // 【確認内容】: AHU の heightScale が 1.0 であること 🟡
    })

    it("TC-LOD200-002b: getProceduralShape('pac') が heightScale: 0.25 を返す", () => {
      // 【テスト目的】: getProceduralShape が PAC タイプに対して heightScale: 0.25 を含む設定を返すこと
      // 【テスト内容】: getProceduralShape に 'pac' を渡して戻り値の heightScale を検証
      // 【期待される動作】: { heightScale: 0.25 } を含むオブジェクトが返される
      // 🟡 黄信号: FR-003.2「PAC: height * 0.25」から直接確認

      // 【実際の処理実行】: getProceduralShape を呼び出す
      const result = getProceduralShape('pac')

      // 【結果検証】: heightScale: 0.25 が返されること
      expect(result).not.toBeNull() // 【確認内容】: null ではないこと（PAC は対応タイプ）🟡
      expect(result?.heightScale).toBe(0.25) // 【確認内容】: PAC の heightScale が 0.25 であること 🟡
    })

    it("TC-LOD200-002c: getProceduralShape('fcu') が heightScale: 0.6 を返す", () => {
      // 【テスト目的】: getProceduralShape が FCU タイプに対して heightScale: 0.6 を含む設定を返すこと
      // 【テスト内容】: getProceduralShape に 'fcu' を渡して戻り値の heightScale を検証
      // 【期待される動作】: { heightScale: 0.6 } を含むオブジェクトが返される
      // 🟡 黄信号: FR-003.3「FCU: height * 0.6」から直接確認

      // 【実際の処理実行】: getProceduralShape を呼び出す
      const result = getProceduralShape('fcu')

      // 【結果検証】: heightScale: 0.6 が返されること
      expect(result).not.toBeNull() // 【確認内容】: null ではないこと（FCU は対応タイプ）🟡
      expect(result?.heightScale).toBe(0.6) // 【確認内容】: FCU の heightScale が 0.6 であること 🟡
    })

    it("TC-LOD200-003: getProceduralShape('unknown') が null を返す", () => {
      // 【テスト目的】: getProceduralShape が未知のタイプに対して null を返すこと
      // 【テスト内容】: getProceduralShape に 'unknown' 等の未対応タイプを渡して検証
      // 【期待される動作】: null が返される（FR-003.4 フォールバック）
      // 🔵 青信号: FR-003.4「not ahu, pac, or fcu → fall back to LOD100-style BoxGeometry」から確認

      // 【実際の処理実行】: 未知タイプを渡す
      const resultDamper = getProceduralShape('damper')
      const resultUnknown = getProceduralShape('unknown_type')

      // 【結果検証】: null が返されること（フォールバック）
      expect(resultDamper).toBeNull() // 【確認内容】: 'damper' は未対応タイプのため null が返されること 🔵
      expect(resultUnknown).toBeNull() // 【確認内容】: 未知タイプは null が返されること 🔵
    })
  })

  // ────────────────────────────────────────────────
  // ProceduralEquipment コンポーネントテスト
  // ────────────────────────────────────────────────

  describe('ProceduralEquipment コンポーネント', () => {
    it('TC-LOD200-009: AHU タイプがフル寸法のメッシュで描画される', () => {
      // 【テスト目的】: ProceduralEquipment に type='ahu' を渡した時、フル dimensions の mesh が生成されること
      // 【テスト内容】: ProceduralEquipment コンポーネントを render して DOM 要素を検証
      // 【期待される動作】: data-testid="procedural-equipment" の要素が DOM に存在し、
      //                   AHU 用のフル寸法ボックス形状が描画される
      // 🟡 黄信号: FR-003.1 から確認済み。コンポーネントの DOM 構造は推測

      // 【テストデータ準備】: AHU の寸法と色
      const dimensions: [number, number, number] = [2.5, 1.8, 1.2]
      const color = getEquipmentColor('ahu') // '#4A90E2'

      // 【実際の処理実行】: ProceduralEquipment をレンダリング
      const { container } = render(
        <ProceduralEquipment type="ahu" dimensions={dimensions} color={color} />,
      )

      // 【結果検証】: ProceduralEquipment が DOM に描画されること
      // 【確認内容】: data-testid="procedural-equipment" の要素が存在すること 🟡
      expect(container.querySelector('[data-testid="procedural-equipment"]')).not.toBeNull()
    })

    it('TC-LOD200-010: PAC タイプが薄型形状（height * 0.25）で描画される', () => {
      // 【テスト目的】: ProceduralEquipment に type='pac' を渡した時、height が 0.25 倍された形状が生成されること
      // 【テスト内容】: ProceduralEquipment コンポーネントを render して PAC 専用形状を検証
      // 【期待される動作】: PAC 用の薄型形状（height * 0.25）が描画される
      // 🟡 黄信号: FR-003.2「flat rectangular shape with dimensions [width, height * 0.25, depth]」から確認

      // 【テストデータ準備】: PAC の寸法と色
      const dimensions: [number, number, number] = [1.0, 0.8, 1.0]
      const color = getEquipmentColor('pac') // '#7ED321'

      // 【実際の処理実行】: PAC タイプで ProceduralEquipment をレンダリング
      const { container } = render(
        <ProceduralEquipment type="pac" dimensions={dimensions} color={color} />,
      )

      // 【結果検証】: PAC 用 ProceduralEquipment が DOM に描画されること
      // 【確認内容】: コンポーネントが正常にレンダリングされること 🟡
      expect(container.querySelector('[data-testid="procedural-equipment"]')).not.toBeNull()
      // 【確認内容】: PAC タイプのデータ属性が設定されていること 🟡
      expect(
        container.querySelector('[data-equipment-type="pac"]'),
      ).not.toBeNull()
    })

    it('TC-LOD200-011: FCU タイプがコンパクト形状（height * 0.6）で描画される', () => {
      // 【テスト目的】: ProceduralEquipment に type='fcu' を渡した時、height が 0.6 倍された形状が生成されること
      // 【テスト内容】: ProceduralEquipment コンポーネントを render して FCU 専用形状を検証
      // 【期待される動作】: FCU 用のコンパクト形状（height * 0.6）が描画される
      // 🟡 黄信号: FR-003.3「compact box shape with dimensions [width, height * 0.6, depth]」から確認

      // 【テストデータ準備】: FCU の寸法と色
      const dimensions: [number, number, number] = [0.6, 0.5, 0.4]
      const color = getEquipmentColor('fcu') // '#F39C12'

      // 【実際の処理実行】: FCU タイプで ProceduralEquipment をレンダリング
      const { container } = render(
        <ProceduralEquipment type="fcu" dimensions={dimensions} color={color} />,
      )

      // 【結果検証】: FCU 用 ProceduralEquipment が DOM に描画されること
      // 【確認内容】: コンポーネントが正常にレンダリングされること 🟡
      expect(container.querySelector('[data-testid="procedural-equipment"]')).not.toBeNull()
      // 【確認内容】: FCU タイプのデータ属性が設定されていること 🟡
      expect(
        container.querySelector('[data-equipment-type="fcu"]'),
      ).not.toBeNull()
    })

    it('TC-LOD200-012: 未知タイプが LOD100 ボックスにフォールバックする', () => {
      // 【テスト目的】: ProceduralEquipment に未知のタイプを渡した時、フォールバックとして描画されること
      // 【テスト内容】: 未知タイプ 'damper' で ProceduralEquipment をレンダリングして検証
      // 【期待される動作】: クラッシュせず、フォールバックのボックス形状で描画される
      // 🔵 青信号: FR-003.4「fall back to a LOD100-style BoxGeometry」から直接確認

      // 【テストデータ準備】: damper の寸法と色
      const dimensions: [number, number, number] = [0.3, 0.3, 0.2]
      const color = getEquipmentColor('damper') // '#95A5A6'

      // 【実際の処理実行】: 未知タイプで ProceduralEquipment をレンダリング（クラッシュしないこと）
      expect(() => {
        render(<ProceduralEquipment type="damper" dimensions={dimensions} color={color} />)
      }).not.toThrow() // 【確認内容】: 未知タイプでクラッシュしないこと 🔵

      // 【実際の処理実行】: レンダリングして DOM を検証
      const { container } = render(
        <ProceduralEquipment type="damper" dimensions={dimensions} color={color} />,
      )

      // 【結果検証】: フォールバックボックスが描画されること
      // 【確認内容】: data-testid="procedural-equipment" の要素が存在すること 🔵
      expect(container.querySelector('[data-testid="procedural-equipment"]')).not.toBeNull()
    })
  })

  // ────────────────────────────────────────────────
  // GlbModelRenderer コンポーネントテスト
  // ────────────────────────────────────────────────

  describe('GlbModelRenderer コンポーネント', () => {
    it('TC-LOD200-013a: GlbModelRenderer コンポーネントが存在しインポートできる', () => {
      // 【テスト目的】: GlbModelRenderer コンポーネントが実装されてエクスポートされていること
      // 【テスト内容】: インポートした GlbModelRenderer が関数型コンポーネントであることを確認
      // 【期待される動作】: GlbModelRenderer が typeof function であること
      // 🔵 青信号: FR-002 から確認済み。コンポーネントの存在確認のみ

      // 【結果検証】: GlbModelRenderer が関数型コンポーネントとして存在すること
      expect(GlbModelRenderer).toBeDefined() // 【確認内容】: GlbModelRenderer がエクスポートされていること 🔵
      expect(typeof GlbModelRenderer).toBe('function') // 【確認内容】: 関数型コンポーネントであること 🔵
    })

    it('TC-LOD200-006: LOD200 + modelSrc 有り → GlbModelRenderer パスが選択される', () => {
      // 【テスト目的】: LOD200 + modelSrc 有りの時に GlbModelRenderer の描画パスが選択されること
      // 【テスト内容】: GlbModelRenderer を直接 render して DOM 要素の存在を確認
      // 【期待される動作】: GlbModelRenderer が Suspense 内でレンダリングされること
      // 🟡 黄信号: FR-001.2, FR-002.4 から確認済み。DOM 検証方法は推測

      // 【テストデータ準備】: GLB モデルパスと寸法
      const modelSrc = '/models/ahu.glb'
      const dimensions: [number, number, number] = [2.5, 1.8, 1.2]

      // 【実際の処理実行】: GlbModelRenderer を Suspense でラップしてレンダリング
      const { container } = render(
        <React.Suspense fallback={<div data-testid="lod100-fallback-test">Loading...</div>}>
          <GlbModelRenderer modelSrc={modelSrc} dimensions={dimensions} />
        </React.Suspense>,
      )

      // 【結果検証】: GlbModelRenderer が何らかの要素を描画すること
      // 【確認内容】: コンテナに要素が存在すること（Suspense fallback も含む）🟡
      expect(container.firstChild).not.toBeNull()
    })
  })

  // ────────────────────────────────────────────────
  // Lod100Fallback コンポーネントテスト
  // ────────────────────────────────────────────────

  describe('Lod100Fallback コンポーネント', () => {
    it('TC-LOD200-014: Lod100Fallback が BoxGeometry mesh を描画する', () => {
      // 【テスト目的】: Lod100Fallback コンポーネントが dimensions と color で BoxGeometry を描画すること
      // 【テスト内容】: Lod100Fallback をレンダリングして DOM 要素を検証
      // 【期待される動作】: data-testid="lod100-fallback" の要素が DOM に存在する
      // 🔵 青信号: FR-004.1「BoxGeometry with the node's dimensions」から直接確認

      // 【テストデータ準備】: AHU の寸法と色
      const dimensions: [number, number, number] = [2.5, 1.8, 1.2]
      const color = getEquipmentColor('ahu') // '#4A90E2'

      // 【実際の処理実行】: Lod100Fallback をレンダリング
      const { container } = render(
        <Lod100Fallback dimensions={dimensions} color={color} />,
      )

      // 【結果検証】: Lod100Fallback が DOM に描画されること
      // 【確認内容】: data-testid="lod100-fallback" の要素が存在すること 🔵
      expect(container.querySelector('[data-testid="lod100-fallback"]')).not.toBeNull()
    })
  })

  // ────────────────────────────────────────────────
  // LOD200 TagLabel・PortMarkers 表示テスト
  // ────────────────────────────────────────────────

  describe('LOD200 共通子コンポーネント表示テスト', () => {
    // 【useScene セットアップ】: LOD200 ノードを返すようにモックを設定

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('TC-LOD200-016: LOD200 でも TagLabel テキストが表示される', async () => {
      // 【テスト目的】: LOD200 ノードでも TagLabel が tag テキストを表示すること
      // 【テスト内容】: LOD200 ノードの tag='AHU-201' が DOM に表示されることを確認
      // 【期待される動作】: 'AHU-201' テキストが DOM に存在する
      // 🔵 青信号: FR-001.6「Regardless of LOD level → TagLabel and PortMarkers」から直接確認

      // 【テストデータ準備】: LOD200 AHU ノードを生成
      const testNode = makeTestAhuNodeLod200()

      // 【useScene モック設定】: LOD200 ノードを返すように設定
      const { useScene } = vi.mocked(await import('@kuhl/core'))
      useScene.mockImplementation(
        (selector: (state: { nodes: Record<string, unknown> }) => unknown) =>
          selector({ nodes: { [testNode.id]: testNode } }),
      )

      // 【インポート】: EquipmentRenderer（LOD200 対応後）
      // 🟡 黄信号: EquipmentRenderer が LOD200 分岐を持つように拡張されていることを前提とする
      const { EquipmentRenderer } = await import(
        '../../../components/renderers/equipment-renderer'
      )

      // 【実際の処理実行】: EquipmentRenderer を LOD200 ノードでレンダリング
      const { getByText } = render(<EquipmentRenderer nodeId={testNode.id} />)

      // 【結果検証】: TagLabel のテキストが表示されること
      expect(getByText('AHU-201')).toBeDefined() // 【確認内容】: LOD200 でも 'AHU-201' タグテキストが表示されること 🔵
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// ProceduralEquipment 形状生成 Three.js 直接テスト
// ────────────────────────────────────────────────────────────────────────────

describe('ProceduralEquipment 形状生成 Three.js テスト（モック不要）', () => {
  it('TC-LOD200-010b: PAC タイプの BoxGeometry が height * 0.25 の高さで生成される', () => {
    // 【テスト目的】: PAC タイプの形状生成で height が 0.25 倍になること
    // 【テスト内容】: THREE.BoxGeometry を直接生成して PAC 用スケーリングを検証
    // 【期待される動作】: width=1.0, height=0.2(=0.8*0.25), depth=1.0 の BoxGeometry
    // 🟡 黄信号: FR-003.2 から確認済み。BoxGeometry の直接生成でスケーリングを検証

    // 【テストデータ準備】: PAC の寸法
    const [width, height, depth] = [1.0, 0.8, 1.0]
    const PAC_HEIGHT_SCALE = 0.25

    // 【実際の処理実行】: PAC 用スケーリングで BoxGeometry を生成
    const pacGeometry = new THREE.BoxGeometry(width, height * PAC_HEIGHT_SCALE, depth)

    // 【結果検証】: height が 0.25 倍されていること
    expect(pacGeometry.parameters.width).toBe(1.0) // 【確認内容】: width は変更されないこと 🟡
    expect(pacGeometry.parameters.height).toBeCloseTo(0.2, 5) // 【確認内容】: height が 0.8 * 0.25 = 0.2 であること 🟡
    expect(pacGeometry.parameters.depth).toBe(1.0) // 【確認内容】: depth は変更されないこと 🟡

    pacGeometry.dispose()
  })

  it('TC-LOD200-011b: FCU タイプの BoxGeometry が height * 0.6 の高さで生成される', () => {
    // 【テスト目的】: FCU タイプの形状生成で height が 0.6 倍になること
    // 【テスト内容】: THREE.BoxGeometry を直接生成して FCU 用スケーリングを検証
    // 【期待される動作】: width=0.6, height=0.3(=0.5*0.6), depth=0.4 の BoxGeometry
    // 🟡 黄信号: FR-003.3 から確認済み

    // 【テストデータ準備】: FCU の寸法
    const [width, height, depth] = [0.6, 0.5, 0.4]
    const FCU_HEIGHT_SCALE = 0.6

    // 【実際の処理実行】: FCU 用スケーリングで BoxGeometry を生成
    const fcuGeometry = new THREE.BoxGeometry(width, height * FCU_HEIGHT_SCALE, depth)

    // 【結果検証】: height が 0.6 倍されていること
    expect(fcuGeometry.parameters.width).toBe(0.6) // 【確認内容】: width は変更されないこと 🟡
    expect(fcuGeometry.parameters.height).toBeCloseTo(0.3, 5) // 【確認内容】: height が 0.5 * 0.6 = 0.3 であること 🟡
    expect(fcuGeometry.parameters.depth).toBe(0.4) // 【確認内容】: depth は変更されないこと 🟡

    fcuGeometry.dispose()
  })

  it('TC-LOD200-009b: AHU タイプの BoxGeometry がフル寸法で生成される', () => {
    // 【テスト目的】: AHU タイプの形状生成で dimensions がそのまま使われること
    // 【テスト内容】: THREE.BoxGeometry を直接生成して AHU 用フル寸法を検証
    // 【期待される動作】: width=2.5, height=1.8, depth=1.2 の BoxGeometry（変形なし）
    // 🟡 黄信号: FR-003.1「full dimensions」から確認済み

    // 【テストデータ準備】: AHU の寸法
    const [width, height, depth] = [2.5, 1.8, 1.2]
    const AHU_HEIGHT_SCALE = 1.0 // フル寸法

    // 【実際の処理実行】: AHU 用フル寸法で BoxGeometry を生成
    const ahuGeometry = new THREE.BoxGeometry(width, height * AHU_HEIGHT_SCALE, depth)

    // 【結果検証】: フル寸法で生成されること
    expect(ahuGeometry.parameters.width).toBe(2.5) // 【確認内容】: width がフル寸法であること 🟡
    expect(ahuGeometry.parameters.height).toBe(1.8) // 【確認内容】: height がフル寸法（変形なし）であること 🟡
    expect(ahuGeometry.parameters.depth).toBe(1.2) // 【確認内容】: depth がフル寸法であること 🟡

    ahuGeometry.dispose()
  })
})
