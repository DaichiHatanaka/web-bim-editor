// @vitest-environment jsdom
/**
 * TASK-0012: Viewer基盤コンポーネント・Canvas・Grid
 * Viewerメインコンポーネントテスト
 *
 * 【テスト目的】: Viewer の初期レンダリングとchildren injection を確認
 * 【テスト内容】: Canvas要素の描画、children prop の受け渡し、Viewer Isolation原則の検証
 * 【期待される動作】: children として渡されたコンポーネントがCanvas内部に描画されること
 * 【参照要件】: REQ-003, REQ-009, UC-01, UC-02
 * 🟡 黄信号: @testing-library/react が document を必要とするため jsdom 環境を指定
 */

// 【テスト前準備】: R3F Canvas をモック化（Node環境ではWebGL/WebGPU不可）
// 【環境初期化】: vi.mock で @react-three/fiber をモック
// 🟡 黄信号: R3F Canvasのテスト環境制約により、モック化が必要

import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'

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
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="drei-grid" />,
  PerspectiveCamera: () => null,
  Environment: () => null,
  Stats: () => <div data-testid="stats" />,
}))

// 【インポート対象】: 新規作成予定の Viewer コンポーネントをインポート
// 【注意】: このファイルはまだ存在しないため、テストは失敗する（Redフェーズ）
import { Viewer } from '../../components/viewer'

describe('Viewer コンポーネント', () => {
  afterEach(() => {
    // 【テスト後処理】: モックをリセットして次のテストに影響しないよう状態を復元
    // 【状態復元】: vi.clearAllMocks() でモック呼び出し履歴をリセット
    // 【DOM クリーンアップ】: cleanup() で各テスト後にレンダリング済みコンポーネントをアンマウント
    cleanup()
    vi.clearAllMocks()
  })

  describe('TC-010: Viewer が children を受け取って描画する', () => {
    it('Viewerがchildren injectionで子コンポーネントを描画する', () => {
      // 【テスト目的】: Viewer Isolation原則に基づき、外部から注入されたコンポーネントが描画されること
      // 【テスト内容】: Viewerコンポーネントに children prop を渡して描画されることを検証
      // 【期待される動作】: TestChildコンポーネントがレンダリングされる
      // 🟡 黄信号: R3F Canvasのテスト環境制約により、完全なレンダリング検証はモック化が必要

      // 【テストデータ準備】: テスト用の子コンポーネントを定義
      // 【初期条件設定】: children injection のテスト準備
      const TestChild = () => <div data-testid="test-child">テスト子コンポーネント</div>

      // 【実際の処理実行】: Viewer に TestChild を children として渡す
      // 【処理内容】: Viewer Isolation原則に基づく children injection パターンの検証
      render(
        <Viewer>
          <TestChild />
        </Viewer>
      )

      // 【結果検証】: TestChild がレンダリングされていること
      // 【期待値確認】: children injection によりエディタ固有機能がViewerに注入されること
      expect(screen.getByTestId('test-child')).toBeTruthy() // 【確認内容】: children injectionで注入されたコンポーネントが描画されること 🟡
    })

    it('Viewerがchildrenなしでも正常にレンダリングされる', () => {
      // 【テスト目的】: children が省略された場合も Viewer が正常に動作すること
      // 【テスト内容】: children なしで Viewer をレンダリングして例外が発生しないことを確認
      // 【期待される動作】: エラーなしで3Dビューポートのベースが表示される
      // 🟡 黄信号: 要件定義書 Viewer props 定義から。children は optional

      // 【実際の処理実行】: children なしで Viewer をレンダリング
      let threwError = false

      try {
        render(<Viewer />)
      } catch {
        threwError = true
      }

      // 【結果検証】: 例外が発生しないこと
      expect(threwError).toBe(false) // 【確認内容】: childrenなしでもViewerがクラッシュしないこと 🟡
    })
  })

  describe('Viewer の基本構造 - R3F Canvas', () => {
    it('Viewer が R3F Canvas 要素を含む', () => {
      // 【テスト目的】: Viewer が R3F Canvas を使用して3Dビューポートを構築していること
      // 【テスト内容】: モック化された Canvas 要素が Viewer 内部に存在することを確認
      // 【期待される動作】: data-testid="r3f-canvas" の要素が存在する
      // 🟡 黄信号: R3F モック化を前提とした間接的な検証

      // 【実際の処理実行】: Viewer をレンダリング
      render(<Viewer />)

      // 【結果検証】: モック化されたCanvasが存在すること
      expect(screen.getByTestId('r3f-canvas')).toBeTruthy() // 【確認内容】: ViewerがR3F Canvasをレンダリングしていること 🟡
    })

    it('Viewer が perf=true の場合に Stats を表示する', () => {
      // 【テスト目的】: パフォーマンスモニターが perf prop で制御されること
      // 【テスト内容】: perf=true の場合に Stats コンポーネントが表示されること
      // 【期待される動作】: data-testid="stats" 要素が存在する
      // 🟡 黄信号: 要件定義書 Viewer props 定義より perf prop が存在することを確認

      // 【実際の処理実行】: perf=true で Viewer をレンダリング
      render(<Viewer perf={true} />)

      // 【結果検証】: Stats コンポーネントが表示されること
      expect(screen.getByTestId('stats')).toBeTruthy() // 【確認内容】: perf=trueでパフォーマンスモニターが表示されること 🟡
    })

    it('Viewer が perf=false の場合に Stats を表示しない', () => {
      // 【テスト目的】: デフォルト（perf=false）ではパフォーマンスモニターが非表示であること
      // 【テスト内容】: perf=false の場合に Stats コンポーネントが表示されないことを確認
      // 【期待される動作】: data-testid="stats" 要素が存在しない
      // 🟡 黄信号: 要件定義書 Viewer props 定義より perf デフォルト値が false

      // 【実際の処理実行】: デフォルト（perf なし）で Viewer をレンダリング
      render(<Viewer />)

      // 【結果検証】: Stats コンポーネントが表示されないこと
      expect(screen.queryByTestId('stats')).toBeNull() // 【確認内容】: perf=false（デフォルト）ではパフォーマンスモニターが非表示 🟡
    })
  })
})
