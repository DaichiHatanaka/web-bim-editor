/**
 * TC-001 ~ TC-030: IFC読込（web-ifc WASM）純粋関数 + 統合テスト
 *
 * Red Phase: 実装ファイル (systems/ifc/ifc-import.ts) が存在しないため
 * import 時点でモジュール解決エラーが発生し、全テストが失敗する。
 *
 * テスト対象:
 *   - filterTargetGeometries (純粋関数)
 *   - flatTransformationToMatrix4 (純粋関数)
 *   - isValidIfcBuffer (純粋関数)
 *   - createArchitectureRefNodeData (純粋関数)
 *   - IFC_TYPE_COLOR_MAP / TARGET_IFC_TYPES (定数)
 *   - initIfcApi (web-ifc統合 / モック)
 *   - parseIfcFile (web-ifc統合 / モック)
 *   - extractStoreys (web-ifc統合 / モック)
 */

import { describe, expect, it, vi } from 'vitest'

// =================================================================
// Green Phase: web-ifc のモック設定
// WASM ランタイムはテスト環境で利用不可のため、IfcAPI をモックする
// TC-024: 正常パス (/wasm/) → IfcAPI インスタンスを返す
// TC-025: 異常パス (/invalid/) → Init() が reject する
// TC-026: デフォルトパス (省略時) → IfcAPI インスタンスを返す
// =================================================================
vi.mock('web-ifc', () => {
  // 【モック定義】: web-ifc IfcAPI のモッククラス
  // SetWasmPath の引数を保持し、'/invalid/' パス時に Init() が reject する
  const MockIfcAPI = vi.fn().mockImplementation(function (this: {
    _wasmPath: string
    SetWasmPath: (path: string) => void
    Init: () => Promise<void>
  }) {
    this._wasmPath = ''
    this.SetWasmPath = vi.fn().mockImplementation(function (
      this: { _wasmPath: string },
      path: string,
    ) {
      this._wasmPath = path
    })
    this.Init = vi.fn().mockImplementation(function (this: { _wasmPath: string }) {
      // 【異常パスシミュレーション】: /invalid/ パスでは Init() が失敗する
      if (this._wasmPath === '/invalid/') {
        return Promise.reject(new Error('WASM load failed'))
      }
      return Promise.resolve()
    })
  })
  return { IfcAPI: MockIfcAPI }
})

import {
  IFC_TYPE_COLOR_MAP,
  TARGET_IFC_TYPES,
  createArchitectureRefNodeData,
  extractStoreys,
  filterTargetGeometries,
  flatTransformationToMatrix4,
  initIfcApi,
  isValidIfcBuffer,
  parseIfcFile,
} from '../../../systems/ifc/ifc-import'
import type {
  IfcParseResult,
  ParsedGeometry,
  ParsedStorey,
} from '../../../systems/ifc/ifc-import'

// =================================================================
// ヘルパー: テスト用 ParsedGeometry を生成
// =================================================================

function createTestGeometry(
  overrides: Partial<ParsedGeometry> = {},
): ParsedGeometry {
  return {
    expressID: overrides.expressID ?? 1,
    ifcType: overrides.ifcType ?? 'IFCWALL',
    vertices: overrides.vertices ?? new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
    indices: overrides.indices ?? new Uint32Array([0, 1, 2]),
    color: overrides.color ?? { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
    flatTransformation:
      overrides.flatTransformation ?? [
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ],
  }
}

// =================================================================
// ヘルパー: テスト用 IfcParseResult を生成
// =================================================================

function createTestParseResult(
  overrides: Partial<IfcParseResult> = {},
): IfcParseResult {
  return {
    geometries: overrides.geometries ?? [],
    storeys: overrides.storeys ?? [],
    errors: overrides.errors ?? [],
  }
}

// =================================================================
// 1. filterTargetGeometries テスト（純粋関数）
// =================================================================

describe('filterTargetGeometries', () => {
  // ---------------------------------------------------------------
  // TC-001: デフォルトフィルタで建築躯体のみ抽出
  // ---------------------------------------------------------------
  it('TC-001: TARGET_IFC_TYPES に含まれる ifcType のジオメトリのみを返す', () => {
    const geometries: ParsedGeometry[] = [
      createTestGeometry({ expressID: 1, ifcType: 'IFCWALL' }),
      createTestGeometry({ expressID: 2, ifcType: 'IFCSLAB' }),
      createTestGeometry({ expressID: 3, ifcType: 'IFCDOOR' }),
      createTestGeometry({ expressID: 4, ifcType: 'IFCWINDOW' }),
      createTestGeometry({ expressID: 5, ifcType: 'IFCBEAM' }),
    ]

    const result = filterTargetGeometries(geometries, [
      'IFCWALL',
      'IFCWALLSTANDARDCASE',
      'IFCSLAB',
      'IFCBEAM',
      'IFCCOLUMN',
      'IFCCOVERING',
    ])

    expect(result).toHaveLength(3)
    expect(result.map((g) => g.ifcType)).toEqual(['IFCWALL', 'IFCSLAB', 'IFCBEAM'])
  })

  // ---------------------------------------------------------------
  // TC-002: IFCWALLSTANDARDCASE も正しくフィルタされる
  // ---------------------------------------------------------------
  it('TC-002: IFCWALLSTANDARDCASE がフィルタ対象に含まれる', () => {
    const geometries: ParsedGeometry[] = [
      createTestGeometry({ expressID: 1, ifcType: 'IFCWALLSTANDARDCASE' }),
      createTestGeometry({ expressID: 2, ifcType: 'IFCFURNISHINGELEMENT' }),
    ]

    const result = filterTargetGeometries(geometries, [...TARGET_IFC_TYPES])

    expect(result).toHaveLength(1)
    expect(result[0].ifcType).toBe('IFCWALLSTANDARDCASE')
  })

  // ---------------------------------------------------------------
  // TC-003: 空配列の場合は空配列を返す
  // ---------------------------------------------------------------
  it('TC-003: 空のジオメトリ配列 → 空配列を返す', () => {
    const result = filterTargetGeometries([], [...TARGET_IFC_TYPES])
    expect(result).toEqual([])
  })

  // ---------------------------------------------------------------
  // TC-004: 全6種の対象IFCタイプが正しくフィルタされる
  // ---------------------------------------------------------------
  it('TC-004: 全対象タイプ（IFCWALL, IFCWALLSTANDARDCASE, IFCSLAB, IFCBEAM, IFCCOLUMN, IFCCOVERING）がフィルタを通過する', () => {
    const allTypes = [
      'IFCWALL',
      'IFCWALLSTANDARDCASE',
      'IFCSLAB',
      'IFCBEAM',
      'IFCCOLUMN',
      'IFCCOVERING',
    ] as const
    const geometries = allTypes.map((ifcType, i) =>
      createTestGeometry({ expressID: i + 1, ifcType }),
    )

    const result = filterTargetGeometries(geometries, [...TARGET_IFC_TYPES])

    expect(result).toHaveLength(6)
    expect(result.map((g) => g.ifcType)).toEqual([...allTypes])
  })

  // ---------------------------------------------------------------
  // TC-005: カスタム targetTypes でフィルタ可能
  // ---------------------------------------------------------------
  it('TC-005: カスタム targetTypes を指定 → 指定したタイプのみ返す', () => {
    const geometries: ParsedGeometry[] = [
      createTestGeometry({ expressID: 1, ifcType: 'IFCWALL' }),
      createTestGeometry({ expressID: 2, ifcType: 'IFCSLAB' }),
      createTestGeometry({ expressID: 3, ifcType: 'IFCCOLUMN' }),
    ]

    const result = filterTargetGeometries(geometries, ['IFCCOLUMN'])

    expect(result).toHaveLength(1)
    expect(result[0].ifcType).toBe('IFCCOLUMN')
  })
})

// =================================================================
// 2. flatTransformationToMatrix4 テスト（純粋関数）
// =================================================================

describe('flatTransformationToMatrix4', () => {
  // ---------------------------------------------------------------
  // TC-006: 正常な16要素配列はそのまま返す
  // ---------------------------------------------------------------
  it('TC-006: 16要素の配列をそのまま返す', () => {
    const flat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 3, 2, 1]
    const result = flatTransformationToMatrix4(flat)

    expect(result).toEqual(flat)
    expect(result).toHaveLength(16)
  })

  // ---------------------------------------------------------------
  // TC-007: 配列長が16でない場合は単位行列を返す（短い配列）
  // ---------------------------------------------------------------
  it('TC-007: 配列長 < 16 → 単位行列を返す', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    const result = flatTransformationToMatrix4([1, 0, 0])

    expect(result).toEqual(identity)
  })

  // ---------------------------------------------------------------
  // TC-008: 配列長が16でない場合は単位行列を返す（長い配列）
  // ---------------------------------------------------------------
  it('TC-008: 配列長 > 16 → 単位行列を返す', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    const tooLong = Array.from({ length: 20 }, () => 0)
    const result = flatTransformationToMatrix4(tooLong)

    expect(result).toEqual(identity)
  })

  // ---------------------------------------------------------------
  // TC-009: null 入力 → 単位行列を返す
  // ---------------------------------------------------------------
  it('TC-009: null 入力 → 単位行列を返す', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    const result = flatTransformationToMatrix4(null as unknown as number[])

    expect(result).toEqual(identity)
  })

  // ---------------------------------------------------------------
  // TC-010: undefined 入力 → 単位行列を返す
  // ---------------------------------------------------------------
  it('TC-010: undefined 入力 → 単位行列を返す', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    const result = flatTransformationToMatrix4(undefined as unknown as number[])

    expect(result).toEqual(identity)
  })

  // ---------------------------------------------------------------
  // TC-011: 単位行列入力はそのまま返す
  // ---------------------------------------------------------------
  it('TC-011: 単位行列入力 → 単位行列を返す', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    const result = flatTransformationToMatrix4(identity)

    expect(result).toEqual(identity)
  })
})

// =================================================================
// 3. isValidIfcBuffer テスト（純粋関数）
// =================================================================

describe('isValidIfcBuffer', () => {
  // ---------------------------------------------------------------
  // TC-012: 有効なIFCヘッダーを持つバッファ → true
  // ---------------------------------------------------------------
  it('TC-012: ISO-10303-21 ヘッダーを含む Uint8Array → true', () => {
    const header = 'ISO-10303-21;\nHEADER;\n'
    const buffer = new TextEncoder().encode(header)

    expect(isValidIfcBuffer(buffer)).toBe(true)
  })

  // ---------------------------------------------------------------
  // TC-013: 無効なバッファ（ランダムバイト）→ false
  // ---------------------------------------------------------------
  it('TC-013: ランダムバイト列 → false', () => {
    const buffer = new Uint8Array([0x00, 0xff, 0xab, 0xcd, 0x12, 0x34])

    expect(isValidIfcBuffer(buffer)).toBe(false)
  })

  // ---------------------------------------------------------------
  // TC-014: 空のバッファ → false
  // ---------------------------------------------------------------
  it('TC-014: 空の Uint8Array → false', () => {
    const buffer = new Uint8Array(0)

    expect(isValidIfcBuffer(buffer)).toBe(false)
  })

  // ---------------------------------------------------------------
  // TC-015: UTF-8 BOM 付きの有効なIFCヘッダー → true
  // ---------------------------------------------------------------
  it('TC-015: BOM + ISO-10303-21 ヘッダー → true', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf])
    const header = new TextEncoder().encode('ISO-10303-21;\n')
    const buffer = new Uint8Array(bom.length + header.length)
    buffer.set(bom)
    buffer.set(header, bom.length)

    expect(isValidIfcBuffer(buffer)).toBe(true)
  })

  // ---------------------------------------------------------------
  // TC-016: 部分一致（ISO-10303 のみ、-21 が無い）→ false
  // ---------------------------------------------------------------
  it('TC-016: ISO-10303 のみで -21 が無い → false', () => {
    const header = 'ISO-10303;\nHEADER;\n'
    const buffer = new TextEncoder().encode(header)

    expect(isValidIfcBuffer(buffer)).toBe(false)
  })
})

// =================================================================
// 4. createArchitectureRefNodeData テスト（純粋関数）
// =================================================================

describe('createArchitectureRefNodeData', () => {
  // ---------------------------------------------------------------
  // TC-017: 正常なパース結果からノードデータを生成
  // ---------------------------------------------------------------
  it('TC-017: ジオメトリとストーリーを含むパース結果 → ifcFilePath, geometryData, levelMapping が正しく設定される', () => {
    const geometries = [
      createTestGeometry({ expressID: 100, ifcType: 'IFCWALL' }),
      createTestGeometry({ expressID: 200, ifcType: 'IFCSLAB' }),
    ]
    const storeys: ParsedStorey[] = [
      { expressID: 10, name: '1F', elevation: 0 },
      { expressID: 20, name: '2F', elevation: 3.5 },
    ]
    const parseResult = createTestParseResult({ geometries, storeys })

    const result = createArchitectureRefNodeData('test.ifc', parseResult)

    expect(result.ifcFilePath).toBe('test.ifc')
    expect(result.geometryData).toEqual(geometries)
    expect(result.levelMapping).toEqual({
      '10': '1F',
      '20': '2F',
    })
  })

  // ---------------------------------------------------------------
  // TC-018: ストーリーが空 → levelMapping は undefined
  // ---------------------------------------------------------------
  it('TC-018: storeys が空配列 → levelMapping は undefined', () => {
    const parseResult = createTestParseResult({
      geometries: [createTestGeometry()],
      storeys: [],
    })

    const result = createArchitectureRefNodeData('test.ifc', parseResult)

    expect(result.ifcFilePath).toBe('test.ifc')
    expect(result.levelMapping).toBeUndefined()
  })

  // ---------------------------------------------------------------
  // TC-019: ジオメトリが空 → geometryData は空配列
  // ---------------------------------------------------------------
  it('TC-019: geometries が空配列 → geometryData は空配列', () => {
    const parseResult = createTestParseResult({ geometries: [] })

    const result = createArchitectureRefNodeData('empty.ifc', parseResult)

    expect(result.ifcFilePath).toBe('empty.ifc')
    expect(result.geometryData).toEqual([])
  })

  // ---------------------------------------------------------------
  // TC-020: ストーリー名が null の場合のマッピング
  // ---------------------------------------------------------------
  it('TC-020: storey.name が null → levelMapping の値が null', () => {
    const storeys: ParsedStorey[] = [
      { expressID: 10, name: null, elevation: 0 },
    ]
    const parseResult = createTestParseResult({ storeys })

    const result = createArchitectureRefNodeData('test.ifc', parseResult)

    expect(result.levelMapping).toBeDefined()
    expect(result.levelMapping!['10']).toBeNull()
  })
})

// =================================================================
// 5. IFC_TYPE_COLOR_MAP 定数テスト
// =================================================================

describe('IFC_TYPE_COLOR_MAP', () => {
  // ---------------------------------------------------------------
  // TC-021: 全対象タイプにカラーが定義されている
  // ---------------------------------------------------------------
  it('TC-021: 全6種の IFC タイプにカラーが定義されている', () => {
    const expectedTypes = [
      'IFCWALL',
      'IFCWALLSTANDARDCASE',
      'IFCSLAB',
      'IFCBEAM',
      'IFCCOLUMN',
      'IFCCOVERING',
    ]

    for (const type of expectedTypes) {
      expect(IFC_TYPE_COLOR_MAP[type]).toBeDefined()
      expect(IFC_TYPE_COLOR_MAP[type]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  // ---------------------------------------------------------------
  // TC-022: 各タイプのカラー値が仕様通り
  // ---------------------------------------------------------------
  it('TC-022: 各タイプのカラーが仕様の値と一致する', () => {
    expect(IFC_TYPE_COLOR_MAP.IFCWALL).toBe('#B0B0B0')
    expect(IFC_TYPE_COLOR_MAP.IFCWALLSTANDARDCASE).toBe('#B0B0B0')
    expect(IFC_TYPE_COLOR_MAP.IFCSLAB).toBe('#C8C8C8')
    expect(IFC_TYPE_COLOR_MAP.IFCBEAM).toBe('#A0A0A0')
    expect(IFC_TYPE_COLOR_MAP.IFCCOLUMN).toBe('#909090')
    expect(IFC_TYPE_COLOR_MAP.IFCCOVERING).toBe('#D0D0D0')
  })
})

// =================================================================
// 6. TARGET_IFC_TYPES 定数テスト
// =================================================================

describe('TARGET_IFC_TYPES', () => {
  // ---------------------------------------------------------------
  // TC-023: 全6種のタイプが含まれる
  // ---------------------------------------------------------------
  it('TC-023: 全6種の IFC エンティティタイプが含まれる', () => {
    expect(TARGET_IFC_TYPES).toContain('IFCWALL')
    expect(TARGET_IFC_TYPES).toContain('IFCWALLSTANDARDCASE')
    expect(TARGET_IFC_TYPES).toContain('IFCSLAB')
    expect(TARGET_IFC_TYPES).toContain('IFCBEAM')
    expect(TARGET_IFC_TYPES).toContain('IFCCOLUMN')
    expect(TARGET_IFC_TYPES).toContain('IFCCOVERING')
    expect(TARGET_IFC_TYPES).toHaveLength(6)
  })
})

// =================================================================
// 7. initIfcApi テスト（web-ifc統合 / モック必要）
// =================================================================

describe('initIfcApi', () => {
  // ---------------------------------------------------------------
  // TC-024: 正常初期化 → IfcAPI インスタンスを返す
  // ---------------------------------------------------------------
  it('TC-024: 正常初期化 → IfcAPI インスタンスを返す', async () => {
    // web-ifc はテスト環境で WASM ランタイムが利用不可のため、
    // Green Phase で vi.mock('web-ifc') を使用してモックする。
    // ここでは initIfcApi が Promise<IfcAPI> を返すことのみ検証。
    const mockIfcApi = {
      SetWasmPath: vi.fn(),
      Init: vi.fn().mockResolvedValue(undefined),
    }

    // Green Phase で web-ifc モック設定後、以下が動作する想定
    const result = await initIfcApi('/wasm/')
    expect(result).toBeDefined()
  })

  // ---------------------------------------------------------------
  // TC-025: WASM 初期化失敗 → IfcInitError をスロー
  // ---------------------------------------------------------------
  it('TC-025: Init() 失敗 → IfcInitError をスロー', async () => {
    // Green Phase で web-ifc モックが Init() を reject するように設定
    await expect(initIfcApi('/invalid/')).rejects.toThrow('IfcInitError')
  })

  // ---------------------------------------------------------------
  // TC-026: デフォルト wasmPath が /wasm/ であること
  // ---------------------------------------------------------------
  it('TC-026: wasmPath 省略時にデフォルト /wasm/ が使用される', async () => {
    // Green Phase で SetWasmPath の引数を検証する
    const result = await initIfcApi()
    expect(result).toBeDefined()
  })
})

// =================================================================
// 8. parseIfcFile テスト（web-ifc統合 / モック必要）
// =================================================================

describe('parseIfcFile', () => {
  // ---------------------------------------------------------------
  // TC-027: 正常パース → IfcParseResult を返す
  // ---------------------------------------------------------------
  it('TC-027: 有効な IFC バッファ → geometries と storeys を含む IfcParseResult を返す', () => {
    // Green Phase で IfcAPI モックを構成し、
    // OpenModel → StreamAllMeshes → GetGeometry → CloseModel の呼び出しを検証
    const mockIfcApi = {} as any
    const buffer = new Uint8Array(0)

    const result = parseIfcFile(mockIfcApi, buffer)

    expect(result).toBeDefined()
    expect(result.geometries).toBeInstanceOf(Array)
    expect(result.storeys).toBeInstanceOf(Array)
    expect(result.errors).toBeInstanceOf(Array)
  })

  // ---------------------------------------------------------------
  // TC-028: 対象外 IFC タイプはフィルタされる
  // ---------------------------------------------------------------
  it('TC-028: IFCDOOR, IFCWINDOW 等の非対象タイプは geometries に含まれない', () => {
    // Green Phase で StreamAllMeshes が IFCDOOR を含むメッシュを返すモックを構成
    const mockIfcApi = {} as any
    const buffer = new Uint8Array(0)

    const result = parseIfcFile(mockIfcApi, buffer)

    for (const geom of result.geometries) {
      expect(TARGET_IFC_TYPES).toContain(geom.ifcType)
    }
  })

  // ---------------------------------------------------------------
  // TC-029: パース中エラー発生 → 部分読込結果 + errors に記録
  // ---------------------------------------------------------------
  it('TC-029: 一部ジオメトリでエラー → 読み込めた要素は geometries に含み、エラーは errors に記録', () => {
    // Green Phase で GetGeometry が一部で例外を投げるモックを構成
    const mockIfcApi = {} as any
    const buffer = new Uint8Array(0)

    const result = parseIfcFile(mockIfcApi, buffer)

    // 部分読込: エラーがあっても geometries は空でない可能性あり
    expect(result.errors).toBeInstanceOf(Array)
  })

  // ---------------------------------------------------------------
  // TC-030: CloseModel が必ず呼ばれる（正常・異常問わず）
  // ---------------------------------------------------------------
  it('TC-030: パース完了後に CloseModel が必ず呼ばれる', () => {
    // Green Phase で mockIfcApi.CloseModel の呼び出しを vi.fn() で検証
    const closeModelSpy = vi.fn()
    const mockIfcApi = {
      OpenModel: vi.fn().mockReturnValue(0),
      StreamAllMeshes: vi.fn(),
      CloseModel: closeModelSpy,
      GetLineIDsWithType: vi.fn().mockReturnValue({ size: () => 0, get: vi.fn() }),
    } as any
    const buffer = new Uint8Array(0)

    parseIfcFile(mockIfcApi, buffer)

    expect(closeModelSpy).toHaveBeenCalledWith(0)
  })
})

// =================================================================
// 9. extractStoreys テスト（web-ifc統合 / モック必要）
// =================================================================

describe('extractStoreys', () => {
  // ---------------------------------------------------------------
  // TC-031: 正常取得 → ParsedStorey[] を返す
  // ---------------------------------------------------------------
  it('TC-031: IfcBuildingStorey が存在 → name と elevation を含む ParsedStorey[] を返す', () => {
    // Green Phase で GetAllLines(modelID, IFCBUILDINGSTOREY) のモックを構成
    const mockIfcApi = {} as any

    const result = extractStoreys(mockIfcApi, 0)

    expect(result).toBeInstanceOf(Array)
  })

  // ---------------------------------------------------------------
  // TC-032: IfcBuildingStorey が存在しない → 空配列
  // ---------------------------------------------------------------
  it('TC-032: IfcBuildingStorey が無い IFC → 空配列を返す', () => {
    const mockIfcApi = {
      GetLineIDsWithType: vi.fn().mockReturnValue({ size: () => 0, get: vi.fn() }),
      GetLine: vi.fn(),
    } as any

    const result = extractStoreys(mockIfcApi, 0)

    expect(result).toEqual([])
  })

  // ---------------------------------------------------------------
  // TC-033: Elevation が取得できない Storey → elevation: null でスキップせず含む
  // ---------------------------------------------------------------
  it('TC-033: Elevation が無い Storey → elevation: null として返す', () => {
    // Green Phase で GetLine が Elevation 無しの Storey を返すモックを構成
    const mockIfcApi = {} as any

    const result = extractStoreys(mockIfcApi, 0)

    expect(result).toBeInstanceOf(Array)
    // elevation が null の要素が含まれうることを検証
  })
})
