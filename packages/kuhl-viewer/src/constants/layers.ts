/**
 * 【機能概要】: Three.jsレイヤー番号の定数定義
 * 【実装方針】: レイヤー番号のハードコードを禁止するため、名前付き定数としてエクスポートする
 * 【テスト対応】: TC-001, TC-002, TC-003, TC-004, TC-014, TC-015, TC-016
 * 🔵 青信号: CLAUDE.md Three.jsレイヤー定義、要件定義書 セクション2.2、既存 packages/viewer/src/lib/layers.ts から確認済み
 *
 * 参照要件: REQ-003, REQ-009
 * 参照設計文書: docs/design/kuhl-hvac-editor/architecture.md — Three.jsレイヤー定義
 */

// 【定数定義】: 通常ジオメトリ（機器、ダクト、配管）用レイヤー
// 【制限値】: Three.js のデフォルトレイヤー（レイヤー0）を使用
// 【型安全性】: as const でリテラル型 0 に絞り込み。number型への暗黙的拡張を防ぐ
// 🔵 青信号: CLAUDE.md および既存 layers.ts から直接確認
export const SCENE_LAYER = 0 as const // 通常ジオメトリ用レイヤー番号（0 = Three.js デフォルト）

// 【定数定義】: エディタヘルパー（ポートマーカー、寸法線）用レイヤー
// 【制限値】: エディタ固有ヘルパーオブジェクトを通常ジオメトリから分離するためのレイヤー
// 【型安全性】: as const でリテラル型 1 に絞り込み
// 🔵 青信号: CLAUDE.md Three.jsレイヤー定義から確認済み
export const EDITOR_LAYER = 1 as const // エディタヘルパー用レイヤー番号

// 【定数定義】: ゾーンオーバーレイ（半透明着色）用レイヤー
// 【制限値】: HVACゾーンの可視化オーバーレイを独立したレイヤーで管理
// 【型安全性】: as const でリテラル型 2 に絞り込み
// 🔵 青信号: CLAUDE.md Three.jsレイヤー定義、要件定義書 セクション2.2 から確認済み
export const ZONE_LAYER = 2 as const // ゾーンオーバーレイ用レイヤー番号
