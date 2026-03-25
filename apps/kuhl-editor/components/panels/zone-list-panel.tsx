/**
 * zone-list-panel.tsx
 * ゾーン一覧パネル・負荷集計表示 コアロジック
 *
 * 【機能概要】: useScene から hvac_zone ノード一覧を取得し、
 * 各ゾーンの面積・冷房負荷・暖房負荷を集計して表示するための
 * 純粋関数群・型定義・定数を提供する。
 * UI コンポーネント実装は zone-list-panel-view.tsx に分離予定。
 *
 * 【参照要件】: REQ-105, REQ-110, EDGE-101
 * 【信頼性】: TASK-0018 要件定義書・テストケース定義書に基づく実装
 * 🔵 信頼性レベル: 要件定義書 §2, §4 に基づく確実な実装
 */

import type { AnyNode, HvacZoneNode, ZoneUsage } from '@kuhl/core'

// ================================================================
// 型定義
// ================================================================

/**
 * 【型定義】: ZoneListPanel コンポーネントの Props
 * 🔵 信頼性: 要件定義書 §2.1.1 に基づく
 */
export interface ZoneListPanelProps {
  /** 【フィルタ】: 指定された場合、そのレベルに属する hvac_zone のみ表示 */
  levelId?: string
  /** 【コールバック】: ゾーン行クリック時に呼び出されるコールバック */
  onZoneSelect?: (zoneId: string) => void
  /** 【コールバック】: 属性編集完了時に呼び出されるコールバック */
  onZoneEdit?: (zoneId: string) => void
}

/**
 * 【型定義】: ゾーン集計結果
 * 🔵 信頼性: 要件定義書 §4.2 に基づく
 */
export interface ZoneSummary {
  /** 【合計面積】: 全ゾーンの floorArea 合計（m2単位） */
  totalArea: number
  /** 【合計冷房負荷】: 全ゾーンの coolingLoad 合計（W単位、内部表現） */
  totalCoolingLoad: number
  /** 【合計暖房負荷】: 全ゾーンの heatingLoad 合計（W単位、内部表現） */
  totalHeatingLoad: number
  /** 【ゾーン数】: 集計対象のゾーン件数 */
  zoneCount: number
}

// ================================================================
// 定数定義
// ================================================================

/**
 * 【定数定義】: ZoneUsage の全11種に対応する日本語ラベルマップ
 * 【実装方針】: 要件定義書 §2.2 で定義された全 ZoneUsage の日本語ラベルを網羅
 * 【テスト対応】: TC-016, TC-017
 * 🔵 信頼性: 要件定義書 §2.2 に基づく確実な定義
 */
export const ZONE_USAGE_LABELS: Record<ZoneUsage, string> = {
  /** 【事務所】: 一般的なオフィス用途 */
  office: '事務所',
  /** 【会議室】: 会議・打ち合わせ用途 */
  meeting: '会議室',
  /** 【サーバー室】: IT機器設置・発熱量が高い用途 */
  server_room: 'サーバー室',
  /** 【ロビー】: 入口・待合・共用スペース */
  lobby: 'ロビー',
  /** 【廊下】: 通行・移動用スペース */
  corridor: '廊下',
  /** 【トイレ】: 衛生設備用途 */
  toilet: 'トイレ',
  /** 【厨房】: 調理・食品加工用途 */
  kitchen: '厨房',
  /** 【倉庫】: 物品保管用途 */
  warehouse: '倉庫',
  /** 【機械室】: 空調・給排水等の設備機械設置用途 */
  mechanical_room: '機械室',
  /** 【電気室】: 受変電・電気設備設置用途 */
  electrical_room: '電気室',
  /** 【その他】: 上記に分類されないその他の用途 */
  other: 'その他',
}

// ================================================================
// 純粋関数
// ================================================================

/**
 * 【機能概要】: nodes辞書から hvac_zone 型のノードのみを抽出する
 * 【実装方針】: Object.values でノード一覧を取得し、type === 'hvac_zone' でフィルタ。
 *   levelId が指定された場合は parentId でさらにフィルタする。
 * 【改善内容】: nodes パラメータ型を Record<string, AnyNode> に精緻化し、
 *   useScene の nodes 辞書と直接互換性を持つよう型安全性を向上。
 * 【テスト対応】: TC-001, TC-002, TC-003, TC-004
 * 🔵 信頼性: 要件定義書 §3.1 および §4.1 に基づく確実な実装
 * @param nodes - useScene の nodes 辞書（Record<string, AnyNode>）
 * @param levelId - フィルタリング用のレベルID（省略可）
 * @returns HvacZoneNode[] - hvac_zone 型のノード配列
 */
export function getZonesFromScene(
  nodes: Record<string, AnyNode>,
  levelId?: string,
): HvacZoneNode[] {
  // 【hvac_zoneフィルタ】: nodes辞書の全値から type === 'hvac_zone' のみ抽出
  const allZones = Object.values(nodes).filter(
    (n): n is HvacZoneNode => n.type === 'hvac_zone',
  )

  // 【levelIdフィルタ】: levelId が指定された場合、parentId が一致するゾーンのみ返す
  if (levelId !== undefined) {
    return allZones.filter((z) => z.parentId === levelId)
  }

  // 【全件返却】: levelId 未指定の場合は全 hvac_zone を返す
  return allZones
}

/**
 * 【機能概要】: HvacZoneNode 配列から合計面積・合計負荷・ゾーン数を集計する
 * 【実装方針】: reduce で totalArea/totalCoolingLoad/totalHeatingLoad を合計。
 *   loadResult が undefined のゾーンは冷暖房負荷を 0 として扱う（?? 0 演算子使用）。
 * 【テスト対応】: TC-005, TC-006, TC-007, TC-008
 * 🔵 信頼性: 要件定義書 §3.2 および §4.2 に基づく確実な実装
 * @param zones - 集計対象の HvacZoneNode 配列
 * @returns ZoneSummary - 集計結果（totalArea/totalCoolingLoad/totalHeatingLoad/zoneCount）
 */
export function calculateZoneSummary(zones: HvacZoneNode[]): ZoneSummary {
  // 【空配列処理】: ゾーンが0件の場合は全て0を返す
  if (zones.length === 0) {
    return {
      totalArea: 0,
      totalCoolingLoad: 0,
      totalHeatingLoad: 0,
      zoneCount: 0,
    }
  }

  // 【集計処理】: reduce で全ゾーンの面積・負荷を合計
  const totalArea = zones.reduce((sum, z) => sum + z.floorArea, 0)

  // 【冷房負荷合計】: loadResult?.coolingLoad が undefined の場合は 0 として加算
  const totalCoolingLoad = zones.reduce(
    (sum, z) => sum + (z.loadResult?.coolingLoad ?? 0),
    0,
  )

  // 【暖房負荷合計】: loadResult?.heatingLoad が undefined の場合は 0 として加算
  const totalHeatingLoad = zones.reduce(
    (sum, z) => sum + (z.loadResult?.heatingLoad ?? 0),
    0,
  )

  // 【結果返却】: 集計結果を ZoneSummary 型で返す
  return {
    totalArea,
    totalCoolingLoad,
    totalHeatingLoad,
    zoneCount: zones.length,
  }
}

/**
 * 【機能概要】: W単位の負荷値を kW単位の表示文字列に変換する
 * 【実装方針】: watts が undefined の場合は "-" を返す。
 *   それ以外は watts / 1000 で kW に変換し、toFixed(1) で小数点1桁に整形後 "kW" を付加。
 * 【テスト対応】: TC-009, TC-010, TC-011, TC-012
 * 🔵 信頼性: 要件定義書 §4.3 に基づく確実な実装
 * @param watts - W単位の負荷値（undefined 可）
 * @returns string - "15.0kW" 形式の文字列。undefined の場合は "-"
 */
export function formatLoadValue(watts: number | undefined): string {
  // 【undefined処理】: 未計算・値なしの場合はダッシュを返す
  if (watts === undefined) {
    return '-'
  }

  // 【W→kW変換】: /1000 で kW に変換し、小数点1桁 + "kW" で整形
  return `${(watts / 1000).toFixed(1)}kW`
}

/**
 * 【機能概要】: 面積値を小数点1桁 + "m2" の表示文字列に変換する
 * 【実装方針】: toFixed(1) で小数点1桁に整形後 "m2" を付加する。
 * 【テスト対応】: TC-013, TC-014, TC-015
 * 🔵 信頼性: 要件定義書 §4.4 に基づく確実な実装
 * @param area - m2単位の面積値
 * @returns string - "50.0m2" 形式の文字列
 */
export function formatAreaValue(area: number): string {
  // 【フォーマット】: 小数点1桁 + "m2" 単位で整形して返す
  return `${area.toFixed(1)}m2`
}

// ================================================================
// React コンポーネント（設計メモ）
// ================================================================

/**
 * 【設計メモ】: ZoneListPanel の JSX UI 実装について
 *
 * JSX を含む ZoneListPanel コンポーネントは zone-list-panel-view.tsx に実装済み。
 * このファイル（zone-list-panel.tsx）には JSX を含まないことで、
 * vitest の node 環境（jsx: preserve 設定下）でもテストが通るように設計している。
 *
 * ZoneListPanel コンポーネントをインポートする場合:
 *   import { ZoneListPanel } from './zone-list-panel-view'
 *   または
 *   import ZoneListPanel from './zone-list-panel-view'
 *
 * 🔵 信頼性: ifc-upload-panel と同様の設計分離パターンに基づく確実な実装
 */
