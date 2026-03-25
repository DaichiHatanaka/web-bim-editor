/**
 * ifc-upload-panel-view.tsx
 * IFC読込UI・ファイルアップロード コンポーネント（JSX View）
 *
 * 【機能概要】: IFCファイルのアップロードUIコンポーネント。
 * ドラッグ＆ドロップとファイル選択ダイアログに対応し、
 * アップロード進捗・エラー・成功状態を表示する。
 *
 * 【設計方針】:
 * - 純粋関数・型定義は ifc-upload-panel.tsx に分離（テスト環境互換のため）
 * - このファイルは JSX を含む View 層のみを担当
 * - processIfcUpload を内部で呼び出してパース処理を実行
 *
 * 【参照要件】: REQ-106, REQ-107, REQ-108, NFR-003, EDGE-001
 * 🟡 信頼性: UI仕様は要件定義書 §5 から妥当な推測
 */

'use client'

import { useCallback, useRef, useState } from 'react'
import {
  type IfcUploadPanelProps,
  processIfcUpload,
  validateIfcFile,
} from './ifc-upload-panel'

// ================================================================
// 内部型定義（コンポーネント専用）
// ================================================================

/** 【型定義】: アップロード状態 🟡 */
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

/**
 * 【機能概要】: IFCファイルアップロードUIコンポーネント
 * 【実装方針】: ドラッグ＆ドロップ + ファイル選択のハイブリッドUI。
 *   - ドラッグ中はドロップゾーンをハイライト
 *   - アップロード中は進捗バーを表示
 *   - エラー時はエラーメッセージを表示
 *   - 成功時はコールバックを呼び出す
 * 【保守性】: 状態は useRef/useState で管理し、副作用は useCallback で分離
 * 🟡 信頼性: UI仕様は要件定義書 §5 から妥当な推測
 */
export function IfcUploadPanel(props: IfcUploadPanelProps) {
  const { onUploadStart, onUploadSuccess, onUploadError } = props

  // 【状態管理】: アップロード状態・進捗・エラー・ドラッグオーバー
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [progressMessage, setProgressMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)

  // 【ファイル入力参照】: input[type=file] の ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 【ヘルパー関数】: ファイル選択後のアップロード処理
   * 【単一責任】: ファイルを受け取り processIfcUpload を呼び出して結果をコールバックに渡す
   * 🟡 信頼性: 要件定義書 §4 のフローから妥当な推測
   */
  const handleFile = useCallback(
    async (file: File) => {
      // 【バリデーション事前確認】: UIレベルでも拡張子チェック（processIfcUpload でも検証される）
      const validation = validateIfcFile(file)
      if (!validation.valid) {
        setStatus('error')
        setErrorMessage(validation.error)
        return
      }

      // 【アップロード開始】: 状態をリセットして開始コールバックを呼び出す
      setStatus('uploading')
      setProgress(0)
      setProgressMessage('準備中...')
      setErrorMessage('')
      onUploadStart?.()

      try {
        // 【パース処理実行】: processIfcUpload で IFC ファイルをパース
        const result = await processIfcUpload(file, {
          onProgress: (progressValue, message) => {
            // 【進捗更新】: onProgress コールバックで UI を更新
            setProgress(progressValue)
            setProgressMessage(message)
          },
        })

        // 【成功処理】: IFC ファイルパスをコールバックに渡す
        setStatus('success')
        setProgress(100)
        setProgressMessage('完了')
        onUploadSuccess?.(result.archNodeData.ifcFilePath)
      } catch (err) {
        // 【エラー処理】: エラーメッセージを表示してコールバックに通知
        const error = err instanceof Error ? err : new Error(String(err))
        setStatus('error')
        setErrorMessage(error.message)
        onUploadError?.(error)
      }
    },
    [onUploadStart, onUploadSuccess, onUploadError],
  )

  /**
   * 【イベントハンドラ】: ファイル選択ダイアログからのファイル選択
   * 🟡 信頼性: 標準的なファイル選択UIパターン
   */
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  /**
   * 【イベントハンドラ】: ドラッグオーバー時のハイライト処理
   * 🟡 信頼性: 標準的なドラッグ＆ドロップUIパターン
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  /** 【イベントハンドラ】: ドラッグリーブ時のハイライト解除 */
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  /**
   * 【イベントハンドラ】: ドロップ時のファイル取得処理
   * 🟡 信頼性: 標準的なドラッグ＆ドロップUIパターン
   */
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragOver(false)
      const file = event.dataTransfer.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  /** 【イベントハンドラ】: ドロップゾーンクリックでファイル選択ダイアログを開く */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* 【ドロップゾーン】: ドラッグ＆ドロップとクリックによるファイル選択 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="IFCファイルをドロップまたはクリックして選択"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          status === 'uploading' ? 'pointer-events-none opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* 【アイコン】: アップロードアイコン（SVG） */}
        <svg
          className="mb-2 h-10 w-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
          />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">クリックしてファイルを選択</span>
          {' またはドラッグ＆ドロップ'}
        </p>
        <p className="mt-1 text-xs text-gray-500">.ifc ファイル（最大 100MB）</p>
      </div>

      {/* 【非表示ファイル入力】: input[type=file] を非表示にしてドロップゾーンのクリックで開く */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* 【進捗表示】: アップロード中のみ表示 */}
      {status === 'uploading' && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{progressMessage}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* 【成功メッセージ】: アップロード成功時に表示 */}
      {status === 'success' && (
        <p className="text-sm font-medium text-green-600">IFCファイルの読み込みが完了しました</p>
      )}

      {/* 【エラーメッセージ】: エラー時に表示 */}
      {status === 'error' && errorMessage && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export default IfcUploadPanel
