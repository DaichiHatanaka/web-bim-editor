/**
 * InteractiveSystem
 *
 * 【目的】: マウスホバー時にObject3Dをハイライト表示し、クリック時に
 *           useViewer.setSelection で選択パスを更新する。
 * 【参照要件】: REQ-003, REQ-009
 * 【実装状態】: Refactor フェーズ完了
 */

// 【型定義】: SelectionPath - 選択状態の階層パス
export type SelectionPath = {
  plantId: string | null
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: string[]
}

// 【型定義】: インタラクション判定に必要な最小プロパティ
// 🔵 青信号: @kuhl/core の BaseNode が持つ id/type/parentId を Pick した型。
//            AnyNode の discriminatedUnion から独立させることで、
//            テスト用の MinimalNode（type: string）とも構造的互換性を保つ。
//            level-visibility-system.tsx の NodeLike と同一定義。
type NodeLike = {
  id: string
  type: string
  parentId: string | null
}

/**
 * 【機能概要】: nodeId から SelectionPath を解決する純粋関数
 * 【改善内容】: Green フェーズからロジック変更なし（既に明快で最小な実装）
 * 【設計方針】: selectedIds に nodeId を初期設定した上で parentId チェーンを辿る。
 *              ノード自身の type も対象にすることで、level や zone を直接選択した
 *              ときにも正しく path が解決される。
 * 【パフォーマンス】: O(depth)。depth ≤ 50 のため実用上問題なし。
 * 【保守性】: MAX_DEPTH=50 で無限ループを防止。
 * 🟡 信頼性レベル: 要件定義書 セクション2.2.3 resolveSelectionPath（推測要素あり）
 * @param nodeId - 選択ノードのID
 * @param nodes - 全ノード辞書
 * @returns SelectionPath - 階層パスを含む選択状態
 */
export function resolveSelectionPath(
  nodeId: string,
  nodes: Record<string, NodeLike>,
): SelectionPath {
  // 【初期パス定義】: 全て null の初期状態、selectedIds に nodeId を設定（TC-019）
  const path: SelectionPath = {
    plantId: null,
    buildingId: null,
    levelId: null,
    zoneId: null,
    selectedIds: [nodeId],
  }

  // 【ノード存在チェック】: 存在しない nodeId の場合は初期パスを返す（TC-019）
  if (!nodes[nodeId]) {
    return path
  }

  // 【階層トラバース開始】: 選択ノード自身から始め、parentId チェーンを辿る
  // 【対象ノード】: 選択ノード自身の type も判定する（TC-015: fcu 選択時に完全パスを解決）
  let currentId: string | null = nodeId
  const MAX_DEPTH = 50
  let depth = 0

  // 【ループ処理】: parentId チェーンを root まで辿る
  while (currentId !== null && depth < MAX_DEPTH) {
    const node: NodeLike | undefined = nodes[currentId]
    if (!node) {
      break
    }

    // 【階層判定】: ノードの type に応じて path の対応フィールドを設定する
    // 🔵 青信号: 要件定義書 セクション2.2.3 pseudocodeに基づく
    if (node.type === 'plant') {
      path.plantId = node.id
    } else if (node.type === 'building') {
      path.buildingId = node.id
    } else if (node.type === 'level') {
      // 【レベル設定】: levelId にレベルノードのIDを設定（TC-016）
      path.levelId = node.id
    } else if (node.type === 'hvac_zone') {
      // 【ゾーン設定】: zoneId にゾーンノードのIDを設定（TC-017）
      path.zoneId = node.id
    }

    // 【次の親へ】: parentId を辿って上位階層に移動する
    currentId = node.parentId
    depth++
  }

  return path
}

/**
 * 【ヘルパー関数】: registryNodes から Object3D → nodeId の逆引き Map を構築する
 * 【再利用性】: resolveHoveredNodeId 内で使用。将来的に InteractiveSystem コンポーネントが
 *              useFrame 内でフレームごとに呼び出す際も、この構築コストを単独で最適化できる。
 * 【単一責任】: 「逆引き Map の構築」という責任のみを担う。
 * 【パフォーマンス】: O(n)。registryNodes の全エントリを 1 回走査して Map を構築する。
 * 🟡 信頼性レベル: パフォーマンス改善のため追加したヘルパー（要件定義書に明示なし）
 * @param registryNodes - ID→Object3D のマッピング
 * @returns object→nodeId の逆引き Map
 */
export function buildReverseRegistryMap(
  registryNodes: Map<string, unknown>,
): Map<unknown, string> {
  // 【逆引きマップ構築】: O(n) で Object3D → nodeId の逆引き Map を生成する
  // 【処理効率化】: 後続の parent チェーントラバースで O(1) ルックアップを実現する 🟡
  const reverseMap = new Map<unknown, string>()
  for (const [nodeId, obj] of registryNodes) {
    if (obj != null) {
      reverseMap.set(obj, nodeId)
    }
  }
  return reverseMap
}

/**
 * 【機能概要】: intersection の Object3D から registryNodes を逆引きして nodeId を返す
 * 【改善内容】: Green フェーズの O(depth × n) ネストループを O(n + depth) に改善。
 *              registryNodes の逆引き Map（buildReverseRegistryMap）を事前構築し、
 *              parent チェーントラバース中の各ステップを O(1) ルックアップにした。
 * 【設計方針】: 直接一致を試み、失敗した場合は parent チェーンを辿る。
 * 【パフォーマンス】: O(n) の逆引き Map 構築 + O(depth) の parent 辿り = O(n + depth)。
 *                    n=1000, depth=50 の想定において Green フェーズ比で最大 50 倍高速。
 * 【保守性】: buildReverseRegistryMap を独立関数にしたことで、将来的に
 *             フレームをまたいだキャッシュ最適化も容易に追加できる。
 * 🟡 信頼性レベル: 要件定義書 セクション2.2.1（ホバーハイライト）から推測 + パフォーマンス改善
 * @param intersection - Three.js Raycaster の intersection 結果（null/undefined 可）
 * @param registryNodes - ID→Object3D のマッピング（Map）
 * @returns 対応する nodeId、見つからない場合は null
 */
export function resolveHoveredNodeId(
  intersection: { object: unknown } | null | undefined,
  registryNodes: Map<string, unknown>,
): string | null {
  // 【null チェック】: intersection が null/undefined の場合は null を返す（TC-023）
  if (intersection == null) {
    return null
  }

  // 【逆引き Map 構築】: O(n) で事前に Object3D → nodeId の逆引き Map を生成する
  // 【可読性向上】: ネストしたループを排除し、parent チェーントラバースを明確に表現 🟡
  const reverseMap = buildReverseRegistryMap(registryNodes)

  // 【対象オブジェクト取得】: intersection.object から開始
  let current: unknown = intersection.object

  // 【最大深度制限】: 無限ループ防止のため最大深度を制限する
  const MAX_DEPTH = 50
  let depth = 0

  // 【parent チェーントラバース】: 直接一致または parent を辿って nodeId を探す
  // 【処理効率化】: reverseMap.get で O(1) ルックアップ（Green フェーズは O(n) だった）🟡
  while (current != null && depth < MAX_DEPTH) {
    // 【逆引き検索】: reverseMap から O(1) で nodeId を取得する（TC-020）
    const nodeId = reverseMap.get(current)
    if (nodeId !== undefined) {
      return nodeId
    }

    // 【parent へ移動】: 一致しない場合は parent を辿る（TC-021: 子メッシュのparentを辿る）
    const obj = current as { parent?: unknown }
    current = obj.parent ?? null
    depth++
  }

  // 【一致なし】: どの registryNode にも一致しない場合は null を返す（TC-022）
  return null
}

/**
 * 【機能概要】: InteractiveSystem React コンポーネント（Systemパターン）
 * 【実装方針】: null を返す描画なしコンポーネント。useFrame での処理は後続で追加予定。
 * 🟡 信頼性レベル: 要件定義書 セクション2.2.4 InteractiveSystem コンポーネント
 */
export function InteractiveSystem(): null {
  return null
}
