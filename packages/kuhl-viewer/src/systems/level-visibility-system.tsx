/**
 * LevelVisibilitySystem
 *
 * 【目的】: useViewer.selection.levelId に基づき、選択レベル配下のノードのみ表示し
 *           他レベルのノードを非表示にする。
 * 【参照要件】: REQ-003, REQ-007
 * 【実装状態】: Refactor フェーズ完了
 */

// 【型定義】: ノードの可視性判定に必要な最小プロパティ
// 🔵 青信号: @kuhl/core の BaseNode が持つ id/type/parentId を Pick した型
//            AnyNode の discriminatedUnion から独立させることで、
//            テスト用の MinimalNode（type: string）とも構造的互換性を保つ
type NodeLike = {
  id: string
  type: string
  parentId: string | null
}

/**
 * 【機能概要】: ノードが指定レベルの子孫かどうかを判定する
 * 【改善内容】: Green フェーズからロジック変更なし（既に最小・明快な実装）
 * 【設計方針】: parentId チェーンをループで辿る。再帰を避けることで
 *              スタックオーバーフローを防止し、MAX_DEPTH による安全な打ち切りを実現。
 * 【パフォーマンス】: O(depth) の線形時間。depth ≤ 50 のため実用上問題なし。
 * 【保守性】: visited Set により循環参照ノードでも安全に動作する。
 * 🔵 信頼性レベル: 要件定義書 セクション2.1.2 parentIdチェーン判定に基づく
 * @param nodeId - 判定対象のノードID
 * @param levelId - 親レベルのID
 * @param nodes - 全ノード辞書
 * @returns ノードが levelId の子孫であれば true
 */
export function isDescendantOfLevel(
  nodeId: string,
  levelId: string,
  nodes: Record<string, NodeLike>,
): boolean {
  // 【最大深度制限】: 循環参照ガード（TC-007: 循環参照でも無限ループしない）
  const MAX_DEPTH = 50

  // 【再帰トラバース開始】: visited Set で循環参照を検出する
  const visited = new Set<string>()
  let currentId: string | null = nodeId
  let depth = 0

  // 【ループ処理】: parentId チェーンを辿る（再帰の代わりにループで実装）
  while (currentId !== null && depth < MAX_DEPTH) {
    // 【循環参照チェック】: 既に訪問済みのノードに再度到達した場合は打ち切る
    if (visited.has(currentId)) {
      return false
    }
    visited.add(currentId)

    // 【ノード取得】: 存在しない nodeId の場合は false を返す（TC-006）
    const node: NodeLike | undefined = nodes[currentId]
    if (!node) {
      return false
    }

    // 【親チェック】: parentId が levelId と一致したら true（TC-001: 直接の子）
    if (node.parentId === levelId) {
      return true
    }

    // 【ルートチェック】: parentId が null ならこれ以上辿れない（TC-004）
    if (node.parentId === null) {
      return false
    }

    // 【次の親へ】: parentId チェーンを上に辿る（TC-002: 孫、TC-005: 深いネスト）
    currentId = node.parentId
    depth++
  }

  return false
}

/**
 * 【ヘルパー関数】: 単一ノードの可視性を決定する
 * 【再利用性】: processLevelVisibility の分岐ロジックを抽出し、単体テスト・再利用しやすい形に。
 * 【単一責任】: 「1ノードの可視性を決める」という責任のみを担う。
 * 🔵 信頼性レベル: 要件定義書 セクション2.1.1 処理ロジックの分岐を忠実に抽出
 * @param nodeId - 判定対象のノードID
 * @param node - 判定対象のノード
 * @param levelId - 現在選択中のレベルID
 * @param nodes - 全ノード辞書（isDescendantOfLevel に渡す）
 * @returns このノードが visible であるべきなら true
 */
export function computeNodeVisibility(
  nodeId: string,
  node: NodeLike,
  levelId: string,
  nodes: Record<string, NodeLike>,
): boolean {
  // 【空間ノード常時表示】: plant/building は常に visible=true（TC-010: EDGE-06）
  // 🔵 青信号: 要件定義書 セクション2.1.1「空間ノード（plant, building）: 常に visible = true」
  if (node.type === 'plant' || node.type === 'building') {
    return true
  }

  // 【選択レベル自体】: id === levelId の場合は visible=true（TC-011）
  // 🔵 青信号: 要件定義書 セクション2.1.1「レベルノード自体: 選択レベルのみ visible = true」
  if (nodeId === levelId) {
    return true
  }

  // 【他レベルノード】: type === 'level' かつ id !== levelId の場合は非表示（TC-011）
  // 🔵 青信号: 要件定義書 セクション2.1.1「他レベルは visible = false」
  if (node.type === 'level') {
    return false
  }

  // 【子孫判定】: isDescendantOfLevel で判定し visible を設定（TC-009, TC-013）
  // 🔵 青信号: 要件定義書 セクション2.1.2 parentIdチェーン判定
  return isDescendantOfLevel(nodeId, levelId, nodes)
}

/**
 * 【機能概要】: levelId に基づいて registryNodes の Object3D.visible を制御する
 * 【改善内容】: ノード判定ロジックを computeNodeVisibility ヘルパーに分割し、
 *              メインループの責任を「走査と適用」のみに限定した。
 * 【設計方針】: levelId=null なら全表示、設定済みなら選択レベル配下のみ表示。
 *              各ノードの可視性判定は computeNodeVisibility に委譲する。
 * 【パフォーマンス】: registryNodes の全エントリを 1 回走査。O(n × depth)。
 * 【保守性】: computeNodeVisibility のテストを単体で書けるため、分岐ロジックの
 *             検証が容易になった。
 * 🔵 信頼性レベル: 要件定義書 セクション2.1.1 処理ロジックに基づく
 * @param nodes - 全ノード辞書
 * @param levelId - 現在選択中のレベルID（null の場合は全表示）
 * @param registryNodes - ID→Object3D のマッピング（Map）
 */
export function processLevelVisibility(
  nodes: Record<string, NodeLike>,
  levelId: string | null,
  registryNodes: Map<string, unknown>,
): void {
  // 【空チェック】: registryNodes が空の場合は何もしない（TC-014）
  if (registryNodes.size === 0) {
    return
  }

  // 【全表示モード】: levelId=null の場合は全ノードを visible=true にする（TC-008: EDGE-01）
  if (levelId === null) {
    for (const [, obj] of registryNodes) {
      const o = obj as { visible: boolean }
      if (o != null) {
        o.visible = true
      }
    }
    return
  }

  // 【レベル選択モード】: levelId が設定されている場合、各ノードの表示を制御する
  // 【設計方針】: ノードごとの可視性は computeNodeVisibility に委譲する
  for (const [nodeId, obj] of registryNodes) {
    // 【未登録スキップ】: registryNodes に未登録（undefined）のノードはスキップ（TC-012: EDGE-02）
    if (obj == null) {
      continue
    }

    const o = obj as { visible: boolean }
    const node = nodes[nodeId]

    // 【ノード情報なし】: nodes に登録されていない場合はスキップ
    if (!node) {
      continue
    }

    // 【可視性適用】: computeNodeVisibility で計算した結果を Object3D に反映
    o.visible = computeNodeVisibility(nodeId, node, levelId, nodes)
  }
}

/**
 * 【機能概要】: LevelVisibilitySystem React コンポーネント（Systemパターン）
 * 【実装方針】: null を返す描画なしコンポーネント。useFrame での処理は後続で追加予定。
 * 🔵 信頼性レベル: 要件定義書 セクション2.1.3 LevelVisibilitySystem コンポーネント
 */
export function LevelVisibilitySystem(): null {
  return null
}
