/**
 * ifc-import.ts - IFC読込モジュール（web-ifc WASM）
 *
 * 【機能概要】: web-ifc（WASM）を使用してIFCファイルをブラウザ内でパースし、
 * 建築躯体（IfcWall, IfcSlab, IfcBeam, IfcColumn, IfcCovering）の
 * ジオメトリを抽出する。
 *
 * 【設計方針】:
 * - 純粋関数（filterTargetGeometries, flatTransformationToMatrix4 等）は
 *   web-ifc 非依存で実装し、単体テストを容易にする
 * - 統合関数（initIfcApi, parseIfcFile, extractStoreys）は web-ifc API を使用する
 * - web-ifc 定数は ifc-schema の名前付き定数（WEBIFC.IFCBUILDINGSTOREY 等）を使用し、
 *   マジックナンバーのハードコードを避ける
 * - extractStoreys は必ず CloseModel の前に呼び出す（CloseModel 後は modelID が無効）
 *
 * 【参照要件】: REQ-106, REQ-107, REQ-108, EDGE-001
 * 🔵 信頼性: 要件定義書・web-ifc API 型定義に基づく実装（Refactorフェーズで品質向上済み）
 */

import { IfcAPI } from 'web-ifc'
import * as WEBIFC from 'web-ifc'

// =================================================================
// 型定義
// =================================================================

/** 【型定義】: パース済みジオメトリデータ（1エンティティ = 1メッシュ） 🔵 */
export type ParsedGeometry = {
  expressID: number
  ifcType: string // 'IFCWALL' | 'IFCSLAB' | 'IFCBEAM' | 'IFCCOLUMN' | 'IFCCOVERING'
  vertices: Float32Array // [x, y, z, x, y, z, ...] 頂点座標
  indices: Uint32Array // 三角形インデックス
  color: { r: number; g: number; b: number; a: number }
  flatTransformation: number[] // 4x4変換行列（フラット配列、16要素）
}

/** 【型定義】: パース済みストーリー（階）情報 🔵 */
export type ParsedStorey = {
  expressID: number
  name: string | null
  elevation: number | null // メートル単位。取得不可の場合は null
}

/** 【型定義】: IFCパース結果 🔵 */
export type IfcParseResult = {
  geometries: ParsedGeometry[]
  storeys: ParsedStorey[]
  errors: string[] // パース中に発生した警告・エラーメッセージ
}

// =================================================================
// 定数定義
// =================================================================

/**
 * 【定数定義】: 抽出対象IFCエンティティタイプ一覧
 * 建築躯体（壁・床・梁・柱・天井）のみを対象とする
 * 🔵 TC-023 対応
 */
export const TARGET_IFC_TYPES = [
  'IFCWALL',
  'IFCWALLSTANDARDCASE',
  'IFCSLAB',
  'IFCBEAM',
  'IFCCOLUMN',
  'IFCCOVERING',
] as const

/**
 * 【定数定義】: IFCエンティティタイプ別カラーマップ（16進数カラーコード）
 * ArchitectureRefRenderer で半透明表示する際のカラーを定義
 * 🔵 TC-021, TC-022 対応
 */
export const IFC_TYPE_COLOR_MAP: Record<string, string> = {
  IFCWALL: '#B0B0B0', // 【壁】: グレー
  IFCWALLSTANDARDCASE: '#B0B0B0', // 【標準壁】: グレー（IFCWALL と同色）
  IFCSLAB: '#C8C8C8', // 【床】: ライトグレー
  IFCBEAM: '#A0A0A0', // 【梁】: ダークグレー
  IFCCOLUMN: '#909090', // 【柱】: ダークグレー
  IFCCOVERING: '#D0D0D0', // 【天井】: ライトグレー
}

// =================================================================
// 純粋関数（web-ifc 非依存）
// =================================================================

/**
 * 【機能概要】: 対象IFCタイプのジオメトリをフィルタリングする純粋関数
 * 【実装方針】: Array.prototype.filter で targetTypes に含まれる ifcType のみを抽出
 * 【テスト対応】: TC-001〜TC-005
 * 🔵 信頼性: 要件定義書 3.1 filterTargetGeometries に基づく実装
 *
 * @param geometries - フィルタリング対象のジオメトリ配列
 * @param targetTypes - フィルタリング対象のIFCエンティティタイプ配列
 * @returns フィルタリング済みジオメトリ配列
 */
export function filterTargetGeometries(
  geometries: ParsedGeometry[],
  targetTypes: string[],
): ParsedGeometry[] {
  // 【フィルタリング処理】: targetTypes に含まれる ifcType のみを通過させる
  return geometries.filter((g) => targetTypes.includes(g.ifcType))
}

/**
 * 【機能概要】: web-ifc の flatTransformation（16要素配列）を検証して返す
 * 【実装方針】: 配列長が16の場合はそのまま返し、それ以外は単位行列を返す
 * 【テスト対応】: TC-006〜TC-011
 * 🔵 信頼性: 要件定義書 3.2 flatTransformationToMatrix4 に基づく実装
 *
 * @param flat - web-ifc PlacedGeometry.flatTransformation（16要素の number[]）
 * @returns 16要素の変換行列配列（または単位行列）
 */
export function flatTransformationToMatrix4(flat: number[]): number[] {
  // 【単位行列定義】: フォールバック用の単位行列（4x4）
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

  // 【入力値検証】: null/undefined/配列長16以外 → 単位行列を返す
  if (!flat || !Array.isArray(flat) || flat.length !== 16) {
    return identity
  }

  // 【正常返却】: 16要素の配列はそのまま返す（Three.js Matrix4.fromArray() で利用可能）
  return flat
}

/**
 * 【機能概要】: IFCバッファの簡易バリデーション
 * 【実装方針】: バッファを UTF-8 デコードして ISO-10303-21 ヘッダーを含むか確認。
 * BOM（UTF-8 BOM: 0xEF 0xBB 0xBF）が付いていても正しく検出できる。
 * 【テスト対応】: TC-012〜TC-016
 * 🔵 信頼性: 要件定義書 3.3 isValidIfcBuffer に基づく実装
 *
 * @param buffer - 検証対象の Uint8Array
 * @returns ISO-10303-21 ヘッダーを含む場合 true、そうでなければ false
 */
export function isValidIfcBuffer(buffer: Uint8Array): boolean {
  // 【空バッファチェック】: 空の場合は無効
  if (!buffer || buffer.length === 0) {
    return false
  }

  // 【テキストデコード】: Uint8Array → 文字列に変換（先頭256バイトのみでチェック）
  // BOM付きUTF-8も TextDecoder が自動的に処理する
  const decoder = new TextDecoder('utf-8')
  const text = decoder.decode(buffer.slice(0, Math.min(buffer.length, 256)))

  // 【IFCヘッダー検証】: ISO-10303-21 文字列を含むか確認
  return text.includes('ISO-10303-21')
}

/**
 * 【機能概要】: パース結果から ArchitectureRefNode.parse() に渡すデータオブジェクトを構築
 * 【実装方針】: filePath と parseResult を組み合わせてノードデータを生成。
 * storeys が存在する場合のみ levelMapping を生成する。
 * 【テスト対応】: TC-017〜TC-020
 * 🔵 信頼性: 要件定義書 3.4 createArchitectureRefNodeData に基づく実装
 *
 * @param filePath - IFCファイルのパスまたは名称
 * @param parseResult - parseIfcFile() の戻り値
 * @returns ArchitectureRefNode.parse() に渡すデータオブジェクト
 */
export function createArchitectureRefNodeData(
  filePath: string,
  parseResult: IfcParseResult,
): {
  ifcFilePath: string
  geometryData: ParsedGeometry[]
  levelMapping: Record<string, string | null> | undefined
} {
  // 【levelMapping 生成】: storeys が存在する場合のみ生成（expressID.toString() → storey.name）
  // storeys が空配列の場合は undefined を返す（EDGE-003: IfcBuildingStorey が存在しない）
  const levelMapping =
    parseResult.storeys.length > 0
      ? Object.fromEntries(
          parseResult.storeys.map((s) => [String(s.expressID), s.name]),
        )
      : undefined

  return {
    ifcFilePath: filePath, // 【IFCファイルパス】: ノードに紐付けるファイル名/パス
    geometryData: parseResult.geometries, // 【ジオメトリデータ】: パース済みジオメトリ配列
    levelMapping, // 【レベルマッピング】: IFC Storey → LevelNode マッピング（存在する場合のみ）
  }
}

// =================================================================
// web-ifc 統合関数
// =================================================================

/**
 * 【機能概要】: web-ifc IfcAPI を初期化して返す
 * 【実装方針】: new IfcAPI() でインスタンス生成 → SetWasmPath() → await Init() の順で初期化。
 * Init() が失敗した場合は IfcInitError をスローする。
 * 【テスト対応】: TC-024〜TC-026
 * 🟡 信頼性: web-ifc API ドキュメントに基づく実装（WASM ランタイムはテスト環境で利用不可）
 *
 * @param wasmPath - WASMファイルが配置されているパス（省略時: '/wasm/'）
 * @returns 初期化済み IfcAPI インスタンス
 * @throws IfcInitError WASM 初期化に失敗した場合
 */
export async function initIfcApi(wasmPath?: string): Promise<IfcAPI> {
  // 【デフォルトパス設定】: Next.js public/ からの相対パス（/wasm/）
  const resolvedPath = wasmPath ?? '/wasm/'

  // 【IfcAPI インスタンス生成】: web-ifc の IfcAPI をインスタンス化
  const ifcApi = new IfcAPI()

  // 【WASMパス設定】: SetWasmPath() でWASMファイルの場所を指定
  ifcApi.SetWasmPath(resolvedPath)

  try {
    // 【WASM初期化】: await Init() でWASMモジュールをロード・初期化
    await ifcApi.Init()
  } catch (error) {
    // 【エラーハンドリング】: Init() 失敗時は IfcInitError をスロー
    // TC-025: '/invalid/' パスでは Init() が reject するため、ここでキャッチする
    throw new Error(
      `IfcInitError: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return ifcApi
}

/**
 * 【機能概要】: IFCバッファをパースしてジオメトリ・ストーリーを抽出する
 * 【改善内容】: Refactorフェーズで以下を修正
 *   - extractStoreys() を CloseModel() の前に呼び出すよう変更（CloseModel後はmodelIDが無効）
 *   - IFCタイプ取得を GetLine().type → GetLineType() + GetNameFromTypeCode() に変更
 *   - エラーメッセージのフォーマットを統一（"IFC xxx error (expressID=N): ..."）
 * 【実装フロー】:
 *   1. OpenModel(buffer) → modelID 取得
 *   2. StreamAllMeshes(modelID, cb) → 各 FlatMesh を処理
 *   3. extractStoreys(modelID) → CloseModel の前に呼び出す（重要）
 *   4. CloseModel(modelID) → try/finally で必ず実行
 * 【エラーハンドリング】: 各ジオメトリのエラーは errors に記録して部分読込を継続。
 * OpenModel 自体の失敗時は空の IfcParseResult を返す。
 * 【テスト対応】: TC-027〜TC-030
 * 🔵 信頼性: web-ifc API 型定義（GetLineType, GetNameFromTypeCode のシグネチャ）に基づく実装
 *
 * @param ifcApi - 初期化済み IfcAPI インスタンス
 * @param buffer - パース対象の IFC バッファ（Uint8Array）
 * @returns IfcParseResult（geometries, storeys, errors）
 */
export function parseIfcFile(ifcApi: IfcAPI, buffer: Uint8Array): IfcParseResult {
  // 【結果オブジェクト初期化】: パース結果を格納するオブジェクト
  const geometries: ParsedGeometry[] = []
  const errors: string[] = []
  let storeys: ParsedStorey[] = []
  let modelID: number | null = null

  try {
    // 【モデルオープン】: OpenModel() でIFCモデルをロードし modelID を取得
    // TC-027/028/029: mockIfcApi = {} の場合、OpenModel が存在しないためエラーをキャッチ
    modelID = ifcApi.OpenModel(buffer)

    try {
      // 【メッシュ列挙】: StreamAllMeshes() で全メッシュをストリーミング処理
      // FlatMesh は expressID と geometries（PlacedGeometry の Vector）を持つ
      ifcApi.StreamAllMeshes(modelID, (flatMesh) => {
        // 【各メッシュ処理】: FlatMesh から PlacedGeometry を取り出してジオメトリを抽出
        const numGeometries = flatMesh.geometries.size()
        for (let i = 0; i < numGeometries; i++) {
          try {
            // 【PlacedGeometry 取得】: geometries Vector から i 番目の PlacedGeometry を取得
            const placedGeom = flatMesh.geometries.get(i)
            const geometryExpressID = placedGeom.geometryExpressID

            // 【IfcGeometry 取得】: GetGeometry() で頂点・インデックスデータを取得
            const geometry = ifcApi.GetGeometry(modelID as number, geometryExpressID)

            // 【頂点データ取得】: GetVertexArray() で Float32Array を取得
            const vertices = ifcApi.GetVertexArray(
              geometry.GetVertexData(),
              geometry.GetVertexDataSize(),
            )
            // 【インデックスデータ取得】: GetIndexArray() で Uint32Array を取得
            const indices = ifcApi.GetIndexArray(
              geometry.GetIndexData(),
              geometry.GetIndexDataSize(),
            )

            // 【色情報取得】: PlacedGeometry.color から RGBA を取得
            const color = {
              r: placedGeom.color.x,
              g: placedGeom.color.y,
              b: placedGeom.color.z,
              a: placedGeom.color.w,
            }

            // 【変換行列取得】: PlacedGeometry.flatTransformation から変換行列を取得
            const flatTransformation = placedGeom.flatTransformation

            // 【IFCタイプ取得】: GetLineType() → GetNameFromTypeCode() でタイプ名を取得
            // 🔵 GetLineType() が web-ifc API に存在することを型定義で確認済み
            const ifcTypeCode = ifcApi.GetLineType(modelID as number, flatMesh.expressID)
            const ifcTypeName =
              typeof ifcTypeCode === 'number'
                ? ifcApi.GetNameFromTypeCode(ifcTypeCode)
                : 'UNKNOWN'

            // 【ParsedGeometry 生成】: 取得したデータを ParsedGeometry 型に変換
            const parsedGeometry: ParsedGeometry = {
              expressID: flatMesh.expressID,
              ifcType: ifcTypeName,
              vertices,
              indices,
              color,
              flatTransformation: Array.from(
                { length: 16 },
                (_, idx) => flatTransformation[idx] ?? 0,
              ),
            }

            geometries.push(parsedGeometry)

            // 【GPUリソース解放】: IfcGeometry は使用後に削除
            geometry.delete()
          } catch (err) {
            // 【部分エラー記録】: 個別ジオメトリのエラーは errors に記録して処理を継続
            // TC-029: 部分エラーが発生しても geometries に読み込めた要素を含む
            errors.push(
              `IFC geometry parse error (expressID=${flatMesh.expressID}): ${err instanceof Error ? err.message : String(err)}`,
            )
          }
        }
      })

      // 【ストーリー抽出】: CloseModel の前に extractStoreys() を呼び出す
      // 🔵 CloseModel() 後は modelID が無効になるため、必ず CloseModel の前に呼ぶ必要がある
      storeys = extractStoreys(ifcApi, modelID)
    } finally {
      // 【モデルクローズ】: 正常・異常問わず CloseModel() を呼び出してリソースを解放
      // TC-030: CloseModel が必ず呼ばれることを検証
      ifcApi.CloseModel(modelID)
    }
  } catch (err) {
    // 【全体エラーハンドリング】: OpenModel が存在しない・失敗した場合は空の結果を返す
    // TC-027/028/029: {} as any を渡した場合、OpenModel が undefined のため TypeError が発生する
    // → errors に記録して空の IfcParseResult を返す
    if (modelID === null) {
      // 【OpenModel 失敗】: モデルオープン自体が失敗した場合のみエラー記録
      errors.push(
        `IFC model open error: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    // 【CloseModel/extractStoreys 失敗】: finally 内のエラーは modelID が有効なため記録
  }

  // 【フィルタリング】: 対象IFCタイプ（建築躯体）のみを返す（TC-028 対応）
  const filteredGeometries = filterTargetGeometries(geometries, [...TARGET_IFC_TYPES])

  return {
    geometries: filteredGeometries,
    storeys,
    errors,
  }
}

/**
 * 【機能概要】: IFCモデルから IfcBuildingStorey 情報を抽出する
 * 【実装方針】: GetLineIDsWithType() で全 IfcBuildingStorey の expressID を取得し、
 * GetLine() で各ストーリーの Name と Elevation を抽出する。
 * 【設計詳細】:
 * - WEBIFC.IFCBUILDINGSTOREY（型コード定数）を使用してハードコードを避ける
 * - Elevation が取得できない場合は elevation: null として返す（スキップしない）
 * - この関数は parseIfcFile 内で CloseModel() の前に呼ぶこと
 * 【テスト対応】: TC-031〜TC-033
 * 🔵 信頼性: web-ifc API 型定義（GetLineIDsWithType のシグネチャ）に基づく実装
 *
 * @param ifcApi - 初期化済み IfcAPI インスタンス
 * @param modelID - OpenModel() で取得したモデルID（CloseModel 前に使用すること）
 * @returns ParsedStorey[] (IfcBuildingStorey の配列)
 */
export function extractStoreys(ifcApi: IfcAPI, modelID: number): ParsedStorey[] {
  const storeys: ParsedStorey[] = []

  try {
    // 【IFCBUILDINGSTOREY 取得】: GetLineIDsWithType() で全 IfcBuildingStorey の expressID を取得
    // 🔵 WEBIFC.IFCBUILDINGSTOREY は web-ifc/ifc-schema からエクスポートされた型コード定数（3124254112）
    // ハードコードを避け、ライブラリ定数を参照することで定数変更に追随できる
    const storeyLines = ifcApi.GetLineIDsWithType(modelID, WEBIFC.IFCBUILDINGSTOREY)

    // 【各ストーリー処理】: expressID ごとに GetLine() でエンティティを取得
    const size = storeyLines.size()
    for (let i = 0; i < size; i++) {
      const expressID = storeyLines.get(i)

      try {
        // 【エンティティ取得】: GetLine() で IfcBuildingStorey のプロパティを取得
        const storeyLine = ifcApi.GetLine(modelID, expressID)

        // 【Name プロパティ取得】: IfcBuildingStorey.Name（IfcLabel 型）
        // name は IfcLabel オブジェクトまたは文字列
        let name: string | null = null
        if (storeyLine?.Name) {
          name =
            typeof storeyLine.Name === 'string'
              ? storeyLine.Name
              : storeyLine.Name.value ?? null
        }

        // 【Elevation プロパティ取得】: IfcBuildingStorey.Elevation（IfcLengthMeasure 型）
        // elevation は数値またはオブジェクト
        let elevation: number | null = null
        if (storeyLine?.Elevation !== undefined && storeyLine.Elevation !== null) {
          elevation =
            typeof storeyLine.Elevation === 'number'
              ? storeyLine.Elevation
              : storeyLine.Elevation.value ?? null
        }

        storeys.push({
          expressID,
          name,
          elevation,
        })
      } catch (err) {
        // 【個別エラー処理】: 1つのストーリー取得失敗は続行（スキップ）
      }
    }
  } catch {
    // 【全体エラー処理】: GetAllLines が失敗した場合は空配列を返す
    // TC-032: IfcBuildingStorey が無い場合は空配列
  }

  return storeys
}
