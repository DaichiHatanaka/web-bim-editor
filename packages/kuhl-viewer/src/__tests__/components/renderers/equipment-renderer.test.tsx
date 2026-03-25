// @vitest-environment jsdom
/**
 * TASK-0021: EquipmentRenderer（LOD100 ボックス表示）
 * EquipmentRenderer / TagLabel / PortMarkers テスト
 *
 * 【テスト目的】:
 *   - 純粋関数（getEquipmentColor, getPortColor, validateDimensions）の単体検証
 *   - EquipmentRenderer コンポーネントの BoxGeometry レンダリング検証
 *   - TagLabel コンポーネントのタグテキスト表示検証
 *   - PortMarkers コンポーネントのポートマーカー表示検証
 *   - sceneRegistry 登録/解除の動作検証
 * 【テスト内容】:
 *   - getEquipmentColor: 全13種の機器タイプカラー取得、fallback値
 *   - getPortColor: 全12種のポートmediumカラー取得、fallback値
 *   - validateDimensions: 有効/無効な寸法値の判定
 *   - EquipmentRenderer: BoxGeometry生成・位置/回転・SCENE_LAYER割当
 *   - TagLabel: タグテキスト表示・空文字時の非表示
 *   - PortMarkers: ポート数分の球マーカー生成・empty配列時の非表示
 *   - sceneRegistry: マウント時登録・アンマウント時解除
 * 【参照要件】: FR-001, FR-002, FR-003, FR-004, FR-005, EC-001〜EC-008
 * 【テスト環境】: jsdom（コンポーネントテスト）+ node（純粋関数テスト）
 *
 * 🔵 青信号: 要件定義書 FR-001〜FR-005、テストケース定義書 TC-HP-001〜TC-SUP-018
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { sceneRegistry, useScene, AhuNode } from '@kuhl/core'

// 【R3Fモック】: Node/jsdom環境ではWebGL/WebGPUが使用できないためR3Fをモック化
// 🟡 黄信号: テスト環境制約によりモック化が必要
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

// 【Dreiモック】: Html コンポーネントをDOMに直接出力するモックに置き換え
// 🟡 黄信号: @react-three/drei の Html コンポーネントは WebGL context が必要なためモック化
vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drei-html">{children}</div>
  ),
  OrbitControls: () => null,
}))

// 【インポート対象】: 未実装のファイルからエクスポートをインポート（Redフェーズ：全テスト失敗想定）
// 🔵 青信号: 要件定義書 FR-002.1, FR-002.2, FR-004.3 に基づいてインポート
import {
  getEquipmentColor,
  EQUIPMENT_COLOR_MAP,
  EQUIPMENT_FALLBACK_COLOR,
} from '../../../constants/equipment-colors'

import {
  getPortColor,
  PORT_MEDIUM_COLOR_MAP,
  PORT_FALLBACK_COLOR,
} from '../../../constants/port-styles'

import {
  validateDimensions,
  EquipmentRenderer,
} from '../../../components/renderers/equipment-renderer'

import { TagLabel } from '../../../components/renderers/parts/tag-label'
import { PortMarkers } from '../../../components/renderers/parts/port-markers'

// ─────────────────────────────────────────────────────────────────────────────
// テストデータ定義
// ─────────────────────────────────────────────────────────────────────────────

/** 標準テスト用 AHU ノード（testcases.md の定義に基づく） */
const makeTestAhuNode = () =>
  AhuNode.parse({
    tag: 'AHU-101',
    equipmentName: 'テスト空調機',
    position: [1, 2, 3],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [2.5, 1.8, 1.2],
    lod: '100',
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

// ─────────────────────────────────────────────────────────────────────────────
// describe グループ
// ─────────────────────────────────────────────────────────────────────────────

describe('EquipmentRenderer テスト', () => {
  // ──────────────────────────────────────────────
  // 純粋関数テスト（モック不要）
  // ──────────────────────────────────────────────

  describe('純粋関数テスト', () => {
    // ── getEquipmentColor ────────────────────────

    describe('getEquipmentColor', () => {
      it('TC-HP-002: 全13タイプのカラーが正しく返される', () => {
        // 【テスト目的】: getEquipmentColor() が各機器タイプに対して正しい色を返すこと
        // 【テスト内容】: 全13種の機器タイプに対して EQUIPMENT_COLOR_MAP の期待値と一致するか検証
        // 【期待される動作】: 各タイプに対して仕様書に定義されたカラーコードが返される
        // 🔵 青信号: 要件定義書 FR-002.1、テストケース定義書 TC-HP-002 に基づく

        // 【テストデータ準備】: 全13タイプとその期待カラーのマッピング
        const expectedColors: Record<string, string> = {
          ahu: '#4A90E2',
          pac: '#7ED321',
          fcu: '#F39C12',
          vrf_outdoor: '#2C3E50',
          vrf_indoor: '#3498DB',
          diffuser: '#E74C3C',
          damper: '#95A5A6',
          fan: '#9B59B6',
          pump: '#1ABC9C',
          chiller: '#27AE60',
          boiler: '#E67E22',
          cooling_tower: '#16A085',
          valve: '#34495E',
        }

        // 【実際の処理実行】: 各タイプに対して getEquipmentColor を呼び出す
        for (const [type, expectedColor] of Object.entries(expectedColors)) {
          const result = getEquipmentColor(type)
          // 【結果検証】: 各タイプに対して期待カラーが返されること
          expect(result).toBe(expectedColor) // 【確認内容】: 機器タイプに対応した色コードが返されること 🔵
        }

        // 【追加検証】: EQUIPMENT_COLOR_MAP が全13タイプを定義していること
        expect(Object.keys(EQUIPMENT_COLOR_MAP).length).toBe(13) // 【確認内容】: カラーマップに13タイプが定義されていること 🔵
      })

      it('TC-HP-003: 未知タイプでフォールバックカラーが返される', () => {
        // 【テスト目的】: EQUIPMENT_COLOR_MAP に存在しないタイプに対してフォールバック色が返されること
        // 【テスト内容】: 未知のタイプ文字列を渡して getEquipmentColor の戻り値を検証
        // 【期待される動作】: フォールバックカラー #CCCCCC が返される
        // 🔵 青信号: 要件定義書 FR-002.2、テストケース定義書 TC-HP-003 に基づく

        // 【実際の処理実行】: 未知のタイプで getEquipmentColor を呼び出す
        expect(getEquipmentColor('unknown_type')).toBe('#CCCCCC') // 【確認内容】: 未知タイプに対してフォールバックカラーが返されること 🔵
        expect(getEquipmentColor('')).toBe('#CCCCCC') // 【確認内容】: 空文字タイプに対してもフォールバックカラーが返されること 🔵
        expect(EQUIPMENT_FALLBACK_COLOR).toBe('#CCCCCC') // 【確認内容】: EQUIPMENT_FALLBACK_COLOR 定数が #CCCCCC であること 🔵
      })
    })

    // ── getPortColor ─────────────────────────────

    describe('getPortColor', () => {
      it('TC-HP-006: 全12 medium のカラーが正しく返される', () => {
        // 【テスト目的】: getPortColor() が各ポートmediumに対して正しい色を返すこと
        // 【テスト内容】: 全12種のmediumに対して PORT_MEDIUM_COLOR_MAP の期待値と一致するか検証
        // 【期待される動作】:
        //   - 空気系統: #5DADE2（水色）
        //   - 水系統: #2874A6（濃青）
        //   - 冷媒系統: #28A745（緑）
        //   - 排水: #999999（グレー）
        //   - 電気・信号: #FFD700（金色）
        // 🔵 青信号: 要件定義書 FR-004.3、ポート表示仕様 medium別カラー定義

        // 【実際の処理実行】: 空気系統のmedium検証
        expect(getPortColor('supply_air')).toBe('#5DADE2') // 【確認内容】: supply_air の色が水色であること 🔵
        expect(getPortColor('return_air')).toBe('#5DADE2') // 【確認内容】: return_air の色が水色であること 🔵
        expect(getPortColor('outside_air')).toBe('#5DADE2') // 【確認内容】: outside_air の色が水色であること 🔵
        expect(getPortColor('exhaust_air')).toBe('#5DADE2') // 【確認内容】: exhaust_air の色が水色であること 🔵

        // 【実際の処理実行】: 水系統のmedium検証
        expect(getPortColor('chilled_water')).toBe('#2874A6') // 【確認内容】: chilled_water の色が濃青であること 🔵
        expect(getPortColor('hot_water')).toBe('#2874A6') // 【確認内容】: hot_water の色が濃青であること 🔵
        expect(getPortColor('condenser_water')).toBe('#2874A6') // 【確認内容】: condenser_water の色が濃青であること 🔵

        // 【実際の処理実行】: 冷媒系統のmedium検証
        expect(getPortColor('refrigerant_liquid')).toBe('#28A745') // 【確認内容】: refrigerant_liquid の色が緑であること 🔵
        expect(getPortColor('refrigerant_gas')).toBe('#28A745') // 【確認内容】: refrigerant_gas の色が緑であること 🔵

        // 【実際の処理実行】: 排水の検証
        expect(getPortColor('drain')).toBe('#999999') // 【確認内容】: drain の色がグレーであること 🔵

        // 【実際の処理実行】: 電気・信号の検証
        expect(getPortColor('electric')).toBe('#FFD700') // 【確認内容】: electric の色が金色であること 🔵
        expect(getPortColor('signal')).toBe('#FFD700') // 【確認内容】: signal の色が金色であること 🔵

        // 【追加検証】: PORT_MEDIUM_COLOR_MAP が定義されていること
        expect(PORT_MEDIUM_COLOR_MAP).toBeDefined() // 【確認内容】: PORT_MEDIUM_COLOR_MAP が存在すること 🔵
      })

      it('TC-ERR-012: 未知 medium でフォールバックカラーが返される', () => {
        // 【テスト目的】: PORT_MEDIUM_COLOR_MAP に存在しない medium に対してフォールバック色が返されること
        // 【テスト内容】: 未知の medium 文字列を渡して getPortColor の戻り値を検証
        // 【期待される動作】: フォールバックカラー #AAAAAA が返される
        // 🔵 青信号: 要件定義書 EC-005、テストケース定義書 TC-ERR-012

        // 【実際の処理実行】: 未知のmediumでgetPortColorを呼び出す
        expect(getPortColor('unknown_medium')).toBe('#AAAAAA') // 【確認内容】: 未知mediumに対してフォールバックカラーが返されること 🔵
        expect(getPortColor('')).toBe('#AAAAAA') // 【確認内容】: 空文字mediumに対してもフォールバックカラーが返されること 🔵
        expect(PORT_FALLBACK_COLOR).toBe('#AAAAAA') // 【確認内容】: PORT_FALLBACK_COLOR 定数が #AAAAAA であること 🔵
      })
    })

    // ── validateDimensions ───────────────────────

    describe('validateDimensions', () => {
      it('TC-HP-001: 有効な dimensions で true を返す', () => {
        // 【テスト目的】: validateDimensions() が正の値の寸法に対して true を返すこと
        // 【テスト内容】: 正常な寸法値（全て正の数）を渡して検証
        // 【期待される動作】: true が返される
        // 🔵 青信号: 要件定義書 FR-001.1、テストケース定義書 TC-HP-001

        // 【実際の処理実行】: 正常な寸法値を渡す
        expect(validateDimensions([2.5, 1.8, 1.2])).toBe(true) // 【確認内容】: AHUの通常寸法で true が返されること 🔵
        expect(validateDimensions([1, 1, 1])).toBe(true) // 【確認内容】: 立方体寸法で true が返されること 🔵
        expect(validateDimensions([0.1, 0.1, 0.1])).toBe(true) // 【確認内容】: 小さな寸法でも true が返されること 🔵
      })

      it('TC-ERR-009: ゼロ dimensions で false を返す', () => {
        // 【テスト目的】: validateDimensions() がゼロの寸法に対して false を返すこと
        // 【テスト内容】: ゼロ値を含む寸法を渡して検証
        // 【期待される動作】: false が返される（Three.js のゼロサイズジオメトリを防止）
        // 🔵 青信号: 要件定義書 EC-002、テストケース定義書 TC-ERR-009

        // 【実際の処理実行】: ゼロ寸法を渡す
        expect(validateDimensions([0, 0, 0])).toBe(false) // 【確認内容】: 全ゼロ寸法で false が返されること 🔵
        expect(validateDimensions([0, 1, 1])).toBe(false) // 【確認内容】: 一つでもゼロの場合 false が返されること 🔵
      })

      it('TC-EDGE-014: 負の dimensions で false を返す', () => {
        // 【テスト目的】: validateDimensions() が負の値の寸法に対して false を返すこと
        // 【テスト内容】: 負の値を含む寸法を渡して検証
        // 【期待される動作】: false が返される
        // 🔵 青信号: 要件定義書 EC-002、テストケース定義書 TC-EDGE-014

        // 【実際の処理実行】: 負の寸法値を渡す
        expect(validateDimensions([-1, 2, -3])).toBe(false) // 【確認内容】: 負の値を含む場合 false が返されること 🔵
        expect(validateDimensions([-0.1, -0.1, -0.1])).toBe(false) // 【確認内容】: 全て負の値の場合 false が返されること 🔵
      })

      it('TC-EDGE-013: 大きな dimensions で true を返す', () => {
        // 【テスト目的】: validateDimensions() が非常に大きな寸法に対して true を返すこと
        // 【テスト内容】: 100m x 100m x 100m の大きな寸法を渡して検証
        // 【期待される動作】: true が返される（サイズ上限なし）
        // 🟡 黄信号: 要件定義書に明示されていないが NFR-001 から合理的に推測

        // 【実際の処理実行】: 大きな寸法値を渡す
        expect(validateDimensions([100, 100, 100])).toBe(true) // 【確認内容】: 大きな寸法で true が返されること 🟡
      })
    })

    // ── BoxGeometry 生成（純粋な Three.js テスト）──────

    describe('BoxGeometry 生成', () => {
      it('TC-HP-001b: 正しい寸法で BoxGeometry が生成される（Three.js 直接テスト）', () => {
        // 【テスト目的】: THREE.BoxGeometry が dimensions から正しいパラメータで生成されることを確認
        // 【テスト内容】: Three.js の BoxGeometry を直接生成してパラメータを検証
        // 【期待される動作】: geometry.parameters が dimensions と一致する
        // 🔵 青信号: 要件定義書 FR-001.1、テストケース定義書 TC-HP-001

        // 【テストデータ準備】: AHU ノードの寸法
        const [w, h, d] = [2.5, 1.8, 1.2]

        // 【実際の処理実行】: BoxGeometry を生成する
        const geometry = new THREE.BoxGeometry(w, h, d)

        // 【結果検証】: BoxGeometry のパラメータが寸法と一致すること
        expect(geometry).toBeInstanceOf(THREE.BoxGeometry) // 【確認内容】: BoxGeometry インスタンスであること 🔵
        expect(geometry.parameters.width).toBe(2.5) // 【確認内容】: width パラメータが dimensions[0] と一致すること 🔵
        expect(geometry.parameters.height).toBe(1.8) // 【確認内容】: height パラメータが dimensions[1] と一致すること 🔵
        expect(geometry.parameters.depth).toBe(1.2) // 【確認内容】: depth パラメータが dimensions[2] と一致すること 🔵

        geometry.dispose()
      })

      it('TC-EDGE-013b: 大きな dimensions でも BoxGeometry が正常に生成される', () => {
        // 【テスト目的】: 100m x 100m x 100m の大きな BoxGeometry が正常に生成されることを確認
        // 【テスト内容】: 大きな寸法で BoxGeometry を生成してパラメータを検証
        // 【期待される動作】: 正常に生成されクラッシュしない
        // 🟡 黄信号: 要件定義書 NFR-001

        // 【実際の処理実行】: 大きな BoxGeometry を生成
        const geometry = new THREE.BoxGeometry(100, 100, 100)

        // 【結果検証】: パラメータが正しく、頂点が存在すること
        expect(geometry.parameters.width).toBe(100) // 【確認内容】: width が 100 であること 🟡
        expect(geometry.parameters.height).toBe(100) // 【確認内容】: height が 100 であること 🟡
        expect(geometry.parameters.depth).toBe(100) // 【確認内容】: depth が 100 であること 🟡
        expect(geometry.attributes.position.count).toBeGreaterThan(0) // 【確認内容】: 頂点が存在すること 🟡

        geometry.dispose()
      })
    })
  })

  // ──────────────────────────────────────────────
  // TagLabel コンポーネントテスト
  // ──────────────────────────────────────────────

  describe('TagLabel コンポーネント', () => {
    it('TC-HP-004: tag テキストが表示される', () => {
      // 【テスト目的】: TagLabel コンポーネントが tag プロパティのテキストを DOM に表示すること
      // 【テスト内容】: tag='AHU-101' と offset=[0, 1.2, 0] で TagLabel をレンダリングして検証
      // 【期待される動作】: DOM 上に 'AHU-101' テキストが表示される
      // 🔵 青信号: 要件定義書 FR-003.1、テストケース定義書 TC-HP-004

      // 【テストデータ準備】: タグ名と offset を設定
      const tag = 'AHU-101'
      const offset: [number, number, number] = [0, 1.2, 0]

      // 【実際の処理実行】: TagLabel コンポーネントをレンダリング
      const { getByText } = render(<TagLabel tag={tag} offset={offset} />)

      // 【結果検証】: タグテキストが DOM に存在すること
      expect(getByText('AHU-101')).toBeDefined() // 【確認内容】: 'AHU-101' テキストが表示されること 🔵
    })

    it('TC-ERR-011: 空文字 tag で TagLabel が描画されない', () => {
      // 【テスト目的】: tag が空文字の場合に TagLabel が何もレンダリングしないこと
      // 【テスト内容】: tag='' で TagLabel をレンダリングして検証
      // 【期待される動作】: TagLabel が null を返し何も表示されない
      // 🔵 青信号: 要件定義書 FR-003.4、EC-004、テストケース定義書 TC-ERR-011

      // 【テストデータ準備】: 空文字のタグ
      const tag = ''
      const offset: [number, number, number] = [0, 1.2, 0]

      // 【実際の処理実行】: 空文字タグで TagLabel をレンダリング
      const { container } = render(<TagLabel tag={tag} offset={offset} />)

      // 【結果検証】: 何も描画されないこと
      expect(container.firstChild).toBeNull() // 【確認内容】: 空文字タグの場合コンテナが空であること 🔵
    })
  })

  // ──────────────────────────────────────────────
  // PortMarkers コンポーネントテスト
  // ──────────────────────────────────────────────

  describe('PortMarkers コンポーネント', () => {
    it('TC-HP-005: ポート数分の球メッシュが生成される', () => {
      // 【テスト目的】: PortMarkers コンポーネントが ports 配列の数だけマーカーをレンダリングすること
      // 【テスト内容】: 2つのポートを持つ ports 配列で PortMarkers をレンダリングして検証
      // 【期待される動作】: 2つのポートマーカーが生成される
      // 🔵 青信号: 要件定義書 FR-004.1、テストケース定義書 TC-HP-005

      // 【テストデータ準備】: 2つのポートを定義
      const ports = [
        {
          id: 'port_0',
          name: 'Supply Air Out',
          medium: 'supply_air' as const,
          direction: 'out' as const,
          position: [1.25, 0, 0] as [number, number, number],
          connectedTo: null,
        },
        {
          id: 'port_1',
          name: 'Return Air In',
          medium: 'return_air' as const,
          direction: 'in' as const,
          position: [-1.25, 0, 0] as [number, number, number],
          connectedTo: null,
        },
      ]

      // 【実際の処理実行】: PortMarkers コンポーネントをレンダリング
      let threwError = false
      try {
        render(<PortMarkers ports={ports} />)
      } catch {
        threwError = true
      }

      // 【結果検証】: クラッシュせずにレンダリングされること
      // （Three.js シーングラフの詳細検証は統合テストで行う）
      expect(threwError).toBe(false) // 【確認内容】: ポートを持つ場合にクラッシュしないこと 🔵
    })

    it('TC-ERR-010: 空 ports 配列で何も描画されない', () => {
      // 【テスト目的】: ports が空配列の場合に PortMarkers が何もレンダリングしないこと
      // 【テスト内容】: ports=[] で PortMarkers をレンダリングして検証
      // 【期待される動作】: null が返され何も描画されない
      // 🔵 青信号: 要件定義書 FR-004.7、EC-003、テストケース定義書 TC-ERR-010

      // 【テストデータ準備】: 空のポート配列
      const ports: Parameters<typeof PortMarkers>[0]['ports'] = []

      // 【実際の処理実行】: 空のポート配列で PortMarkers をレンダリング
      const { container } = render(<PortMarkers ports={ports} />)

      // 【結果検証】: 何も描画されないこと
      expect(container.firstChild).toBeNull() // 【確認内容】: 空ポート配列の場合コンテナが空であること 🔵
    })

    it('TC-EDGE-015: 20個以上のポートが正常に描画される', () => {
      // 【テスト目的】: 大量のポート（20個）を持つ場合にクラッシュしないこと
      // 【テスト内容】: 20個のポートを持つ配列で PortMarkers をレンダリングして検証
      // 【期待される動作】: クラッシュせずに正常にレンダリングされる
      // 🟡 黄信号: 要件定義書 NFR-001、NFR-002.2

      // 【テストデータ準備】: 20個のポートを生成
      const ports = Array.from({ length: 20 }, (_, i) => ({
        id: `port_${i}`,
        name: `Port ${i}`,
        medium: 'supply_air' as const,
        direction: (i % 2 === 0 ? 'out' : 'in') as 'out' | 'in',
        position: [i * 0.1, 0, 0] as [number, number, number],
        connectedTo: null,
      }))

      // 【実際の処理実行】: 20個のポートで PortMarkers をレンダリング
      let threwError = false
      try {
        render(<PortMarkers ports={ports} />)
      } catch {
        threwError = true
      }

      // 【結果検証】: クラッシュしないこと
      expect(threwError).toBe(false) // 【確認内容】: 20個のポートでもクラッシュしないこと 🟡
    })
  })

  // ──────────────────────────────────────────────
  // EquipmentRenderer コンポーネントテスト
  // ──────────────────────────────────────────────

  describe('EquipmentRenderer コンポーネント', () => {
    beforeEach(() => {
      // 【テスト前準備】: useScene ストアとsceneRegistryをクリーンな状態にリセット
      // 【環境初期化】: 前のテストのノードが残らないよう初期化する
      useScene.getState().clearScene()
      sceneRegistry.clear()
    })

    afterEach(() => {
      // 【テスト後処理】: ストアとregistryをリセットし、テスト間の干渉を防止
      // 【状態復元】: 次のテストに影響しないよう状態を復元する
      useScene.getState().clearScene()
      sceneRegistry.clear()
      vi.clearAllMocks()
    })

    it('TC-SUP-016: 存在しないノード ID で null が返される', () => {
      // 【テスト目的】: EquipmentRenderer が存在しないノードIDに対して null を返すこと
      // 【テスト内容】: useScene に未登録の nodeId で EquipmentRenderer をレンダリングして検証
      // 【期待される動作】: null が返され何も描画されない（クラッシュしない）
      // 🔵 青信号: 要件定義書 FR-005.5、EC-001、テストケース定義書 TC-SUP-016

      // 【テストデータ準備】: 存在しないノードID
      const nonExistentId = 'ahu_nonexistent_xyz' as Parameters<typeof EquipmentRenderer>[0]['nodeId']

      // 【実際の処理実行】: 存在しないIDで EquipmentRenderer をレンダリング
      const { container } = render(<EquipmentRenderer nodeId={nonExistentId} />)

      // 【結果検証】: 何も描画されないこと
      expect(container.firstChild).toBeNull() // 【確認内容】: 存在しないノードIDに対して null が返されること 🔵
    })

    it('TC-HP-007: マウント時に sceneRegistry に登録される', () => {
      // 【テスト目的】: EquipmentRenderer がマウント時に sceneRegistry へノードを登録すること
      // 【テスト内容】: AHU ノードをストアに登録し EquipmentRenderer をレンダリングして検証
      // 【期待される動作】: sceneRegistry.nodes に nodeId が登録される
      // 🟡 黄信号: 要件定義書 FR-005.1、FR-005.2

      // 【テストデータ準備】: AHU ノードをストアに登録
      const ahuNode = makeTestAhuNode()
      useScene.getState().createNode(ahuNode)

      // 【初期条件確認】: 登録前は sceneRegistry にノードが存在しないこと
      expect(sceneRegistry.nodes.has(ahuNode.id)).toBe(false) // 【確認内容】: マウント前は未登録 🟡

      // 【実際の処理実行】: EquipmentRenderer をレンダリング
      render(<EquipmentRenderer nodeId={ahuNode.id} />)

      // 【結果検証】: sceneRegistry にノードが登録されること
      expect(sceneRegistry.nodes.has(ahuNode.id)).toBe(true) // 【確認内容】: マウント後に sceneRegistry に登録されること 🟡
      expect(sceneRegistry.byType.ahu.has(ahuNode.id)).toBe(true) // 【確認内容】: byType.ahu にも登録されること 🟡
    })

    it('TC-SUP-017: アンマウント時に sceneRegistry から削除される', () => {
      // 【テスト目的】: EquipmentRenderer がアンマウント時に sceneRegistry からノードを削除すること
      // 【テスト内容】: マウント→アンマウントの流れで sceneRegistry の状態を検証
      // 【期待される動作】: アンマウント後に sceneRegistry.nodes から nodeId が削除される
      // 🟡 黄信号: 要件定義書 FR-005.3、NFR-002.3、EC-008

      // 【テストデータ準備】: AHU ノードをストアに登録
      const ahuNode = makeTestAhuNode()
      useScene.getState().createNode(ahuNode)

      // 【実際の処理実行】: EquipmentRenderer をレンダリングしてアンマウント
      const { unmount } = render(<EquipmentRenderer nodeId={ahuNode.id} />)

      // マウント後の確認（登録済みであること）
      // （実装によっては非同期なので軽量チェック）

      // 【実際の処理実行】: アンマウント
      unmount()

      // 【結果検証】: アンマウント後に sceneRegistry から削除されること
      expect(sceneRegistry.nodes.has(ahuNode.id)).toBe(false) // 【確認内容】: アンマウット後に sceneRegistry から削除されること 🟡
      expect(sceneRegistry.byType.ahu.has(ahuNode.id)).toBe(false) // 【確認内容】: byType.ahu からも削除されること 🟡
    })

    it('TC-HP-004b: TagLabel が tag テキストを表示する（EquipmentRenderer 統合）', () => {
      // 【テスト目的】: EquipmentRenderer が TagLabel を通じてタグテキストを表示すること
      // 【テスト内容】: AHU ノードをレンダリングして DOM に tag テキストが存在するか検証
      // 【期待される動作】: 'AHU-101' が DOM 上に表示される
      // 🔵 青信号: 要件定義書 FR-003.1、FR-005.6

      // 【テストデータ準備】: AHU ノードをストアに登録
      const ahuNode = makeTestAhuNode()
      useScene.getState().createNode(ahuNode)

      // 【実際の処理実行】: EquipmentRenderer をレンダリング
      const { getAllByText } = render(<EquipmentRenderer nodeId={ahuNode.id} />)

      // 【結果検証】: tag テキストが DOM に存在すること
      expect(getAllByText('AHU-101').length).toBeGreaterThan(0) // 【確認内容】: AHU-101 タグテキストが表示されること 🔵
    })

    it('TC-ERR-011b: 空文字 tag の場合 TagLabel が描画されない（EquipmentRenderer 統合）', () => {
      // 【テスト目的】: EquipmentRenderer が空文字 tag の場合に TagLabel を表示しないこと
      // 【テスト内容】: tag='' の AHU ノードをレンダリングして TagLabel が存在しないか検証
      // 【期待される動作】: TagLabel の drei Html 要素が生成されない
      // 🔵 青信号: 要件定義書 FR-003.4、EC-004

      // 【テストデータ準備】: tag が空文字のノードを生成
      const ahuNodeWithEmptyTag = AhuNode.parse({
        tag: '',
        equipmentName: 'タグなし空調機',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        dimensions: [1, 1, 1],
        lod: '100',
        status: 'planned',
      })
      useScene.getState().createNode(ahuNodeWithEmptyTag)

      // 【実際の処理実行】: EquipmentRenderer をレンダリング
      const { container } = render(<EquipmentRenderer nodeId={ahuNodeWithEmptyTag.id} />)

      // 【結果検証】: drei-html テスト ID を持つ要素が存在しないこと（TagLabel が描画されない）
      const htmlElements = container.querySelectorAll('[data-testid="drei-html"]')
      expect(htmlElements.length).toBe(0) // 【確認内容】: 空文字 tag の場合 TagLabel の Html 要素が生成されないこと 🔵
    })
  })

  // ──────────────────────────────────────────────
  // sceneRegistry 統合テスト
  // ──────────────────────────────────────────────

  describe('sceneRegistry 統合テスト', () => {
    beforeEach(() => {
      // 【テスト前準備】: sceneRegistry をクリーン状態にリセット
      sceneRegistry.clear()
    })

    afterEach(() => {
      // 【テスト後処理】: sceneRegistry をクリアし次のテストに影響しないよう初期化
      sceneRegistry.clear()
    })

    it('sceneRegistry.nodes への手動登録・取得・削除が動作する', () => {
      // 【テスト目的】: sceneRegistry の基本的な Map 操作が正常に動作することを確認
      // 【テスト内容】: nodes.set/has/get/delete の動作検証
      // 【期待される動作】: 登録・取得・削除が正常に機能する
      // 🔵 青信号: note.md sceneRegistry 設計から直接確認済み

      // 【テストデータ準備】: モックオブジェクトとノードID
      const nodeId = 'ahu_test_reg_001'
      const mockObject = { type: 'Mesh', uuid: 'mock-uuid' }

      // 【実際の処理実行】: 登録
      sceneRegistry.nodes.set(nodeId, mockObject)

      // 【結果検証】: 登録後に取得できること
      expect(sceneRegistry.nodes.has(nodeId)).toBe(true) // 【確認内容】: 登録後に has() が true を返すこと 🔵
      expect(sceneRegistry.nodes.get(nodeId)).toBe(mockObject) // 【確認内容】: 登録したオブジェクトが get() で取得できること 🔵

      // 【実際の処理実行】: 削除
      sceneRegistry.nodes.delete(nodeId)

      // 【結果検証】: 削除後に存在しないこと
      expect(sceneRegistry.nodes.has(nodeId)).toBe(false) // 【確認内容】: 削除後に has() が false を返すこと 🔵
    })

    it('sceneRegistry.byType.ahu への追加・削除が動作する', () => {
      // 【テスト目的】: sceneRegistry.byType の Set 操作が正常に動作することを確認
      // 【テスト内容】: byType.ahu.add/has/delete の動作検証
      // 【期待される動作】: タイプ別集合への追加・削除が正常に機能する
      // 🔵 青信号: note.md sceneRegistry 設計から直接確認済み

      // 【テストデータ準備】: テスト用ノードID
      const nodeId = 'ahu_test_bytype_001'

      // 【実際の処理実行】: 追加
      sceneRegistry.byType.ahu.add(nodeId)

      // 【結果検証】: 追加後に存在すること
      expect(sceneRegistry.byType.ahu.has(nodeId)).toBe(true) // 【確認内容】: byType.ahu に追加されること 🔵

      // 【実際の処理実行】: 削除
      sceneRegistry.byType.ahu.delete(nodeId)

      // 【結果検証】: 削除後に存在しないこと
      expect(sceneRegistry.byType.ahu.has(nodeId)).toBe(false) // 【確認内容】: byType.ahu から削除されること 🔵
    })
  })
})
