/**
 * TASK-0032: 統合テスト共通ヘルパー
 *
 * resetScene / buildHierarchy など各テストファイルで重複しているセットアップ
 * コードをここに集約する。
 */

import {
  useScene,
  clearSceneHistory,
  PlantNode,
  BuildingNode,
  LevelNode,
} from '@kuhl/core'

/** useScene・undo履歴をリセットする */
export function resetScene(): void {
  useScene.getState().unloadScene()
  clearSceneHistory()
}

/** Plant → Building → Level の3階層を作成して返す */
export function buildHierarchy() {
  const { createNode } = useScene.getState()

  const plant = PlantNode.parse({ plantName: 'テスト' })
  createNode(plant)

  const building = BuildingNode.parse({ buildingName: 'テストビル' })
  createNode(building, plant.id)

  const level = LevelNode.parse({ floorHeight: 3.0, ceilingHeight: 2.7, elevation: 0 })
  createNode(level, building.id)

  return { plant, building, level }
}
