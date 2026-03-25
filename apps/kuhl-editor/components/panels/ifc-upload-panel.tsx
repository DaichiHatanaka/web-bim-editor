/**
 * ifc-upload-panel.tsx
 * IFC読込UI・ファイルアップロード コアロジック
 *
 * 【機能概要】: IFCファイルのバリデーション、サイズフォーマット、バージョン検出、
 * パース処理フローを提供する純粋関数群と型定義。
 * UI コンポーネント実装は ifc-upload-panel-view.tsx に分離。
 *
 * 【参照要件】: REQ-106, REQ-107, REQ-108, NFR-003, EDGE-001
 * 【リファクタ改善】:
 *   - ProcessIfcUploadResult の unknown 型を IfcParseResult / ReturnType で型安全化
 *   - parseIfcFile / createArchitectureRefNodeData の as never キャストを IfcAPI 型で解消
 *   - JSX UI を ifc-upload-panel-view.tsx に分離してテスト環境との互換性を確保
 * 🔵 信頼性: TASK-0017 要件定義書・テストケース定義書に基づく実装
 */

import {
  createArchitectureRefNodeData,
  initIfcApi,
  isValidIfcBuffer,
  parseIfcFile,
  type IfcParseResult,
} from '@kuhl/core'
import type { IfcAPI } from 'web-ifc'

// ================================================================
// 定数定義
// ================================================================

/**
 * 【定数定義】: IFCファイルの最大許容サイズ（バイト単位）
 * 100MB = 100 * 1024 * 1024 = 104857600 バイト
 * 🔵 TC-025 対応
 */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 104857600

// ================================================================
// 型定義
// ================================================================

/** 【型定義】: バリデーション成功結果 */
export interface IfcValidationResult {
  valid: true
}

/** 【型定義】: バリデーション失敗結果（エラーメッセージ付き） */
export interface IfcValidationError {
  valid: false
  error: string
}

/** 【型定義】: バリデーション結果のユニオン型 */
export type IfcValidationOutcome = IfcValidationResult | IfcValidationError

/** 【型定義】: IfcUploadPanel コンポーネントの Props */
export interface IfcUploadPanelProps {
  onUploadStart?: () => void
  onUploadSuccess?: (archRefId: string) => void
  onUploadError?: (error: Error) => void
}

/** 【型定義】: processIfcUpload のオプション */
export interface ProcessIfcUploadOptions {
  onProgress?: (progress: number, message: string) => void
}

/** 【型定義】: processIfcUpload の戻り値 🔵 型安全化（Refactorフェーズで unknown から具体型に変更） */
export interface ProcessIfcUploadResult {
  /** 【archNodeData】: createArchitectureRefNodeData() の戻り値 */
  archNodeData: ReturnType<typeof createArchitectureRefNodeData>
  /** 【parseResult】: parseIfcFile() の戻り値（@kuhl/core の IfcParseResult 型） */
  parseResult: IfcParseResult
  /** 【buffer】: File.arrayBuffer() から生成した IFC バイナリバッファ */
  buffer: Uint8Array
}

// ================================================================
// 純粋関数
// ================================================================

/**
 * 【機能概要】: IFCファイルの拡張子とサイズを検証する
 * 【実装方針】: 拡張子チェック（大文字小文字不問）を先に行い、次にサイズチェック
 * 【テスト対応】: TC-001〜TC-010
 * 🔵 信頼性: 要件定義書 §2 に基づく実装
 * @param file - 検証対象の File オブジェクト
 * @returns IfcValidationOutcome - 成功時 { valid: true }、失敗時 { valid: false, error: string }
 */
export function validateIfcFile(file: File): IfcValidationOutcome {
  // 【拡張子チェック】: ファイル名から拡張子を取得し、大文字小文字を無視して .ifc か判定
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'ifc') {
    // 【拡張子エラー】: IFC以外のファイルはアップロード不可
    return {
      valid: false,
      error: 'IFCファイル（.ifc）のみアップロード可能です',
    }
  }

  // 【サイズチェック】: ファイルサイズが MAX_FILE_SIZE_BYTES を超える場合はエラー
  if (file.size > MAX_FILE_SIZE_BYTES) {
    // 【サイズ計算】: 実際のMBサイズをフォーマットしてエラーメッセージに含める
    const actualMB = formatFileSize(file.size)
    return {
      valid: false,
      error: `ファイルサイズが100MBを超えています（${actualMB}）`,
    }
  }

  // 【正常終了】: 拡張子・サイズともに問題なし
  return { valid: true }
}

/**
 * 【機能概要】: バイト数を人間が読みやすい文字列に変換する
 * 【実装方針】: GB→MB→KB→B の順に閾値チェックし、適切な単位を選択
 * 【テスト対応】: TC-011〜TC-018
 * 🔵 信頼性: テストケース定義書の期待値に基づく実装
 * @param bytes - 変換対象のバイト数
 * @returns string - "500B" / "1.0KB" / "50.0MB" / "1.0GB" 形式の文字列
 */
export function formatFileSize(bytes: number): string {
  // 【GB判定】: 1024MB（1073741824バイト）以上の場合
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  }

  // 【MB判定】: 1024KB（1048576バイト）以上の場合
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  // 【KB判定】: 1024バイト以上の場合
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  }

  // 【B表示】: 1024バイト未満はそのままバイト表示
  return `${bytes}B`
}

/**
 * 【機能概要】: Uint8Array バッファからIFCバージョンを検出する
 * 【実装方針】: バッファ先頭部分をテキストデコードし、FILE_SCHEMA を正規表現でマッチ
 * - IFC2X3 → 'IFC2X3'
 * - IFC4, IFC4X* → 'IFC4'（IFC4系として統一）
 * - マッチなし → null
 * 【テスト対応】: TC-019〜TC-024
 * 🟡 信頼性: 要件定義書 §3 の仕様から妥当な推測
 * @param buffer - IFCファイルの Uint8Array バッファ
 * @returns string | null - 検出されたバージョン ('IFC2X3' | 'IFC4' | null)
 */
export function detectIfcVersion(buffer: Uint8Array): string | null {
  // 【空バッファ処理】: バッファが空の場合は null を返す
  if (buffer.length === 0) {
    return null
  }

  // 【テキストデコード】: バッファ先頭部分（最大4096バイト）をUTF-8テキストとしてデコード
  const decoder = new TextDecoder('utf-8')
  const headerText = decoder.decode(buffer.slice(0, Math.min(buffer.length, 4096)))

  // 【FILE_SCHEMAマッチ】: FILE_SCHEMA(('IFCxxx')) パターンを正規表現で検索
  const schemaMatch = headerText.match(/FILE_SCHEMA\s*\(\s*\(\s*'(IFC[^']+)'\s*\)\s*\)/)
  if (!schemaMatch) {
    // 【スキーマ未検出】: FILE_SCHEMA が見つからない場合は null
    return null
  }

  const schema = schemaMatch[1] // 例: 'IFC2X3', 'IFC4', 'IFC4X1'

  // 【バージョン判定】: IFC2X3 系かどうかを判定
  if (schema.startsWith('IFC2X3')) {
    return 'IFC2X3'
  }

  // 【IFC4系判定】: IFC4 から始まる場合は IFC4 として統一して返す
  if (schema.startsWith('IFC4')) {
    return 'IFC4'
  }

  // 【不明スキーマ】: 認識できないスキーマは null を返す
  return null
}

/**
 * 【機能概要】: IFCファイルのパース・ArchitectureRefNodeData作成までの非同期処理フロー
 * 【実装方針】: バリデーション → バッファ取得 → WASM初期化 → パース → ノードデータ構築の順に実行
 * onProgress コールバックで進捗（0→30→70→90）を通知する
 * 【テスト対応】: TC-026〜TC-034
 * 🔵 信頼性: 要件定義書 §4 および Red フェーズ記録の実装指示に基づく
 * @param file - アップロード対象の IFC File オブジェクト
 * @param options - オプション（onProgress コールバックなど）
 * @returns Promise<ProcessIfcUploadResult> - 処理結果（archNodeData, parseResult, buffer）
 */
export async function processIfcUpload(
  file: File,
  options: ProcessIfcUploadOptions,
): Promise<ProcessIfcUploadResult> {
  const { onProgress } = options

  // 【ファイル検証】: 拡張子・サイズを検証し、無効な場合はエラーをスロー
  const validation = validateIfcFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // 【バッファ取得】: File.arrayBuffer() でバイナリデータを取得
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // 【IFCバッファ検証】: isValidIfcBuffer で IFC フォーマットを確認
  const isValid = isValidIfcBuffer(buffer)
  if (!isValid) {
    throw new Error('有効なIFCファイルではありません')
  }

  // 【進捗通知: 0%】: 処理開始を通知
  onProgress?.(0, 'IFCファイルを読み込み中...')

  // 【WASM初期化】: initIfcApi で web-ifc WASM モジュールを初期化
  // 🔵 IfcAPI 型（web-ifc）を明示して as never キャストを排除
  let ifcApi: IfcAPI
  try {
    ifcApi = await initIfcApi()
  } catch {
    // 【WASM初期化エラー】: 初期化失敗時はわかりやすいメッセージをスロー
    throw new Error('WASMの初期化に失敗しました')
  }

  // 【進捗通知: 30%】: WASM 初期化完了を通知
  onProgress?.(30, 'IFCデータを解析中...')

  // 【IFCパース】: parseIfcFile でジオメトリ・ストーリー情報を抽出
  // 🔵 IfcParseResult 型（@kuhl/core）を明示して unknown 型を排除
  let parseResult: IfcParseResult
  try {
    parseResult = parseIfcFile(ifcApi, buffer)
  } catch {
    // 【パースエラー】: パース失敗時はわかりやすいメッセージをスロー
    throw new Error('IFCファイルのパースに失敗しました')
  }

  // 【進捗通知: 70%】: パース完了を通知
  onProgress?.(70, 'ノードデータを構築中...')

  // 【ノードデータ構築】: createArchitectureRefNodeData でシーン用データを生成
  // 🔵 parseResult が IfcParseResult 型であるため as never キャスト不要
  const archNodeData = createArchitectureRefNodeData(file.name, parseResult)

  // 【進捗通知: 90%】: ノードデータ構築完了を通知
  onProgress?.(90, 'アップロード準備完了')

  // 【結果返却】: archNodeData, parseResult, buffer を返す
  return {
    archNodeData,
    parseResult,
    buffer,
  }
}

// ================================================================
// React コンポーネント
// ================================================================

/**
 * 【設計メモ】: IfcUploadPanel の JSX UI 実装について
 *
 * JSX を含む IfcUploadPanel コンポーネントは ifc-upload-panel-view.tsx に分離。
 * このファイル（ifc-upload-panel.tsx）には JSX を含まないことで、
 * vitest の node 環境（jsx: preserve 設定下）でもテストが通るように設計している。
 *
 * IfcUploadPanel コンポーネントをインポートする場合:
 *   import { IfcUploadPanel } from './ifc-upload-panel-view'
 *   または
 *   import IfcUploadPanel from './ifc-upload-panel-view'
 *
 * 🔵 信頼性: テスト環境互換性のための設計分離（Refactorフェーズで実施）
 */
