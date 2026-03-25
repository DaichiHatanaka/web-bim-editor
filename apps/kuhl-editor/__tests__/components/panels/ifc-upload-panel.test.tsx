/**
 * TC-001 ~ TC-034: IFC読込UI・ファイルアップロード テスト
 *
 * Red Phase: 実装ファイル (components/panels/ifc-upload-panel.tsx) が存在しないため
 * import 時点でモジュール解決エラーが発生し、全テストが失敗する。
 *
 * テスト対象:
 *   - validateIfcFile (純粋関数)
 *   - formatFileSize (純粋関数)
 *   - detectIfcVersion (純粋関数)
 *   - processIfcUpload (非同期関数)
 *   - MAX_FILE_SIZE_BYTES (定数)
 *
 * モック対象:
 *   - @kuhl/core の ifc-import 関数群 (initIfcApi, parseIfcFile, createArchitectureRefNodeData, isValidIfcBuffer)
 *
 * 参照要件: REQ-106, REQ-107, REQ-108, NFR-003, EDGE-001
 * 参照設計: TASK-0017 要件定義書 §2, §3
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// =================================================================
// @kuhl/core ifc-import のモック設定
// processIfcUpload が内部で使用する関数群をモックする
// =================================================================
vi.mock('@kuhl/core', () => ({
  initIfcApi: vi.fn(),
  parseIfcFile: vi.fn(),
  createArchitectureRefNodeData: vi.fn(),
  isValidIfcBuffer: vi.fn(),
}))

import {
  MAX_FILE_SIZE_BYTES,
  detectIfcVersion,
  formatFileSize,
  processIfcUpload,
  validateIfcFile,
} from '../../../components/panels/ifc-upload-panel'

import {
  createArchitectureRefNodeData,
  initIfcApi,
  isValidIfcBuffer,
  parseIfcFile,
} from '@kuhl/core'

// =================================================================
// ヘルパー関数
// =================================================================

/**
 * 指定サイズの File オブジェクトを生成するヘルパー
 * File API の size プロパティは読み取り専用のため、
 * Object.defineProperty でオーバーライドする
 */
function createMockFile(name: string, sizeBytes: number): File {
  const file = new File([''], name, { type: '' })
  Object.defineProperty(file, 'size', { value: sizeBytes, writable: false })
  return file
}

/**
 * テキストから Uint8Array バッファを生成するヘルパー
 */
function textToBuffer(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

// =================================================================
// テスト本体
// =================================================================

describe('ifc-upload-panel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===============================================================
  // 1. validateIfcFile テスト
  // ===============================================================
  describe('validateIfcFile', () => {
    describe('正常系', () => {
      it('TC-001: 有効な.ifcファイル（50MB）で { valid: true } を返す', () => {
        const file = createMockFile('test.ifc', 50 * 1024 * 1024)
        expect(validateIfcFile(file)).toEqual({ valid: true })
      })

      it('TC-002: 大文字拡張子.IFCで { valid: true } を返す', () => {
        const file = createMockFile('test.IFC', 1 * 1024 * 1024)
        expect(validateIfcFile(file)).toEqual({ valid: true })
      })

      it('TC-003: 混在ケース.Ifcで { valid: true } を返す', () => {
        const file = createMockFile('model.Ifc', 10 * 1024 * 1024)
        expect(validateIfcFile(file)).toEqual({ valid: true })
      })
    })

    describe('異常系', () => {
      it('TC-004: 非IFC拡張子（.obj）でエラーを返す', () => {
        const file = createMockFile('model.obj', 1 * 1024 * 1024)
        const result = validateIfcFile(file)
        expect(result.valid).toBe(false)
        if (!result.valid) {
          expect(result.error).toBe('IFCファイル（.ifc）のみアップロード可能です')
        }
      })

      it('TC-005: 非IFC拡張子（.step）でエラーを返す', () => {
        const file = createMockFile('model.step', 1 * 1024 * 1024)
        const result = validateIfcFile(file)
        expect(result.valid).toBe(false)
        if (!result.valid) {
          expect(result.error).toBe('IFCファイル（.ifc）のみアップロード可能です')
        }
      })

      it('TC-006: 100MB超のファイル（150MB）でサイズエラーを返す', () => {
        const file = createMockFile('big.ifc', 150 * 1024 * 1024)
        const result = validateIfcFile(file)
        expect(result.valid).toBe(false)
        if (!result.valid) {
          expect(result.error).toContain('ファイルサイズが100MBを超えています')
          expect(result.error).toContain('150.0MB')
        }
      })

      it('TC-007: 拡張子なしファイルでエラーを返す', () => {
        const file = createMockFile('noextension', 1 * 1024 * 1024)
        const result = validateIfcFile(file)
        expect(result.valid).toBe(false)
        if (!result.valid) {
          expect(result.error).toBe('IFCファイル（.ifc）のみアップロード可能です')
        }
      })
    })

    describe('境界値', () => {
      it('TC-008: ちょうど100MB（境界値）で { valid: true } を返す', () => {
        const file = createMockFile('exact.ifc', 100 * 1024 * 1024)
        expect(validateIfcFile(file)).toEqual({ valid: true })
      })

      it('TC-009: 100MB+1バイト（境界超過）でエラーを返す', () => {
        const file = createMockFile('over.ifc', 100 * 1024 * 1024 + 1)
        const result = validateIfcFile(file)
        expect(result.valid).toBe(false)
      })

      it('TC-010: 0バイトファイルで { valid: true } を返す', () => {
        const file = createMockFile('empty.ifc', 0)
        expect(validateIfcFile(file)).toEqual({ valid: true })
      })
    })
  })

  // ===============================================================
  // 2. formatFileSize テスト
  // ===============================================================
  describe('formatFileSize', () => {
    describe('正常系', () => {
      it('TC-011: 500バイト → "500B"', () => {
        expect(formatFileSize(500)).toBe('500B')
      })

      it('TC-012: 1024バイト → "1.0KB"', () => {
        expect(formatFileSize(1024)).toBe('1.0KB')
      })

      it('TC-013: 50MB → "50.0MB"', () => {
        expect(formatFileSize(52428800)).toBe('50.0MB')
      })

      it('TC-014: 100MB → "100.0MB"', () => {
        expect(formatFileSize(104857600)).toBe('100.0MB')
      })

      it('TC-015: 1GB → "1.0GB"', () => {
        expect(formatFileSize(1073741824)).toBe('1.0GB')
      })
    })

    describe('境界値', () => {
      it('TC-016: 0バイト → "0B"', () => {
        expect(formatFileSize(0)).toBe('0B')
      })

      it('TC-017: 1023バイト（KB未満） → "1023B"', () => {
        expect(formatFileSize(1023)).toBe('1023B')
      })

      it('TC-018: 1.5MB → "1.5MB"', () => {
        expect(formatFileSize(1572864)).toBe('1.5MB')
      })
    })
  })

  // ===============================================================
  // 3. detectIfcVersion テスト
  // ===============================================================
  describe('detectIfcVersion', () => {
    describe('正常系', () => {
      it("TC-019: IFC2X3バッファで 'IFC2X3' を返す", () => {
        const buffer = textToBuffer(
          "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC2X3'));\nENDSEC;",
        )
        expect(detectIfcVersion(buffer)).toBe('IFC2X3')
      })

      it("TC-020: IFC4バッファで 'IFC4' を返す", () => {
        const buffer = textToBuffer(
          "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;",
        )
        expect(detectIfcVersion(buffer)).toBe('IFC4')
      })

      it("TC-021: IFC4X1バッファで 'IFC4' を返す（IFC4系として検出）", () => {
        const buffer = textToBuffer(
          "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4X1'));\nENDSEC;",
        )
        expect(detectIfcVersion(buffer)).toBe('IFC4')
      })
    })

    describe('異常系', () => {
      it('TC-022: FILE_SCHEMAが無いバッファで null を返す', () => {
        const buffer = textToBuffer('ISO-10303-21;\nHEADER;\nENDSEC;')
        expect(detectIfcVersion(buffer)).toBeNull()
      })

      it('TC-023: 空バッファで null を返す', () => {
        const buffer = new Uint8Array(0)
        expect(detectIfcVersion(buffer)).toBeNull()
      })

      it('TC-024: 不明なスキーマで null を返す', () => {
        const buffer = textToBuffer(
          "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('UNKNOWN'));\nENDSEC;",
        )
        expect(detectIfcVersion(buffer)).toBeNull()
      })
    })
  })

  // ===============================================================
  // 4. MAX_FILE_SIZE_BYTES テスト
  // ===============================================================
  describe('MAX_FILE_SIZE_BYTES', () => {
    it('TC-025: 定数値が100MB（104857600バイト）であること', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(100 * 1024 * 1024)
      expect(MAX_FILE_SIZE_BYTES).toBe(104857600)
    })
  })

  // ===============================================================
  // 5. processIfcUpload テスト
  // ===============================================================
  describe('processIfcUpload', () => {
    // 各テストの前に web-ifc モック関数をセットアップ
    const mockIfcApi = { _mock: true }
    const mockParseResult = {
      geometries: [
        {
          expressID: 1,
          ifcType: 'IFCWALL',
          vertices: new Float32Array([0, 0, 0]),
          indices: new Uint32Array([0]),
          color: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
          flatTransformation: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        },
      ],
      storeys: [
        { expressID: 100, name: '1F', elevation: 0 },
        { expressID: 101, name: '2F', elevation: 3.5 },
      ],
      errors: [],
    }
    const mockArchNodeData = {
      ifcFilePath: 'test.ifc',
      geometryData: mockParseResult.geometries,
      levelMapping: { '100': '1F', '101': '2F' },
    }

    /**
     * モック関数を正常系のデフォルト状態にセットアップするヘルパー
     */
    function setupSuccessMocks() {
      vi.mocked(isValidIfcBuffer).mockReturnValue(true)
      vi.mocked(initIfcApi).mockResolvedValue(mockIfcApi as any)
      vi.mocked(parseIfcFile).mockReturnValue(mockParseResult as any)
      vi.mocked(createArchitectureRefNodeData).mockReturnValue(mockArchNodeData as any)
    }

    /**
     * 有効な IFC コンテンツを持つ File を生成するヘルパー
     * File.arrayBuffer() が ISO-10303-21 ヘッダーを含む Uint8Array を返す
     */
    function createValidIfcFile(name = 'test.ifc', sizeBytes = 1024): File {
      const content = 'ISO-10303-21;\nHEADER;\nFILE_SCHEMA(("IFC2X3"));\nENDSEC;'
      const file = new File([content], name, { type: '' })
      Object.defineProperty(file, 'size', { value: sizeBytes, writable: false })
      return file
    }

    describe('正常系', () => {
      it('TC-026: 有効なIFCファイルの完全処理フローで archNodeData, parseResult, buffer を返す', async () => {
        setupSuccessMocks()
        const file = createValidIfcFile()

        const result = await processIfcUpload(file, {})

        expect(result).toHaveProperty('archNodeData')
        expect(result).toHaveProperty('parseResult')
        expect(result).toHaveProperty('buffer')
        expect(result.archNodeData).toEqual(mockArchNodeData)
        expect(result.parseResult).toEqual(mockParseResult)
        expect(result.buffer).toBeInstanceOf(Uint8Array)
      })

      it('TC-027: onProgressコールバックが複数回呼ばれ進捗値が単調増加する', async () => {
        setupSuccessMocks()
        const file = createValidIfcFile()
        const progressValues: number[] = []
        const onProgress = vi.fn((progress: number, _message: string) => {
          progressValues.push(progress)
        })

        await processIfcUpload(file, { onProgress })

        expect(onProgress).toHaveBeenCalled()
        // 進捗値が単調増加であることを検証
        for (let i = 1; i < progressValues.length; i++) {
          expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1])
        }
        // 最終進捗は 90 以上であること（Storage アップロードは processIfcUpload のスコープ外）
        expect(progressValues[progressValues.length - 1]).toBeGreaterThanOrEqual(90)
      })
    })

    describe('異常系', () => {
      it('TC-028: 非IFCファイルでエラーをスローする', async () => {
        const file = createMockFile('test.obj', 1024)

        await expect(processIfcUpload(file, {})).rejects.toThrow(
          'IFCファイル（.ifc）のみアップロード可能です',
        )
      })

      it('TC-029: IFCバッファ検証失敗でエラーをスローする', async () => {
        vi.mocked(isValidIfcBuffer).mockReturnValue(false)
        const file = createValidIfcFile()

        await expect(processIfcUpload(file, {})).rejects.toThrow(
          '有効なIFCファイルではありません',
        )
      })

      it('TC-030: WASM初期化失敗でエラーをスローする', async () => {
        vi.mocked(isValidIfcBuffer).mockReturnValue(true)
        vi.mocked(initIfcApi).mockRejectedValue(new Error('WASM load failed'))
        const file = createValidIfcFile()

        await expect(processIfcUpload(file, {})).rejects.toThrow(
          'WASMの初期化に失敗しました',
        )
      })

      it('TC-031: パース失敗でエラーをスローする', async () => {
        vi.mocked(isValidIfcBuffer).mockReturnValue(true)
        vi.mocked(initIfcApi).mockResolvedValue(mockIfcApi as any)
        vi.mocked(parseIfcFile).mockImplementation(() => {
          throw new Error('Parse error')
        })
        const file = createValidIfcFile()

        await expect(processIfcUpload(file, {})).rejects.toThrow(
          'IFCファイルのパースに失敗しました',
        )
      })
    })

    describe('境界値・エッジケース', () => {
      it('TC-032: ジオメトリ空のIFCで正常完了し geometryData が空配列', async () => {
        const emptyGeomResult = { ...mockParseResult, geometries: [] }
        vi.mocked(isValidIfcBuffer).mockReturnValue(true)
        vi.mocked(initIfcApi).mockResolvedValue(mockIfcApi as any)
        vi.mocked(parseIfcFile).mockReturnValue(emptyGeomResult as any)
        vi.mocked(createArchitectureRefNodeData).mockReturnValue({
          ifcFilePath: 'test.ifc',
          geometryData: [],
          levelMapping: { '100': '1F', '101': '2F' },
        } as any)
        const file = createValidIfcFile()

        const result = await processIfcUpload(file, {})

        expect(result.archNodeData.geometryData).toEqual([])
      })

      it('TC-033: ストーリー無しのIFCで正常完了し levelMapping が undefined', async () => {
        const noStoreyResult = { ...mockParseResult, storeys: [] }
        vi.mocked(isValidIfcBuffer).mockReturnValue(true)
        vi.mocked(initIfcApi).mockResolvedValue(mockIfcApi as any)
        vi.mocked(parseIfcFile).mockReturnValue(noStoreyResult as any)
        vi.mocked(createArchitectureRefNodeData).mockReturnValue({
          ifcFilePath: 'test.ifc',
          geometryData: mockParseResult.geometries,
          levelMapping: undefined,
        } as any)
        const file = createValidIfcFile()

        const result = await processIfcUpload(file, {})

        expect(result.archNodeData.levelMapping).toBeUndefined()
      })

      it('TC-034: 部分エラー有りのパース結果で正常完了（成功扱い）', async () => {
        const partialErrorResult = {
          ...mockParseResult,
          errors: ['IFC geometry parse error (expressID=5): mesh data corrupted'],
        }
        vi.mocked(isValidIfcBuffer).mockReturnValue(true)
        vi.mocked(initIfcApi).mockResolvedValue(mockIfcApi as any)
        vi.mocked(parseIfcFile).mockReturnValue(partialErrorResult as any)
        vi.mocked(createArchitectureRefNodeData).mockReturnValue(mockArchNodeData as any)
        const file = createValidIfcFile()

        const result = await processIfcUpload(file, {})

        // パース自体は成功扱い
        expect(result.archNodeData).toEqual(mockArchNodeData)
        expect(result.parseResult.errors.length).toBeGreaterThan(0)
      })
    })
  })
})
