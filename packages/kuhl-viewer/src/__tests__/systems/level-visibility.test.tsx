/**
 * TASK-0020: LevelVisibilitySystem・InteractiveSystem
 * 純粋関数テスト
 *
 * 【テスト目的】: LevelVisibilitySystem/InteractiveSystem のコアロジックを単体検証
 * 【テスト内容】:
 *   - isDescendantOfLevel: 再帰的parentIdチェーン判定
 *   - processLevelVisibility: レベルベース表示制御
 *   - resolveSelectionPath: parentIdからSelectionPath推定
 *   - resolveHoveredNodeId: Object3DからnodeId逆引き
 * 【参照要件】: REQ-003, REQ-007, REQ-009
 * 【テスト環境】: node（純粋関数のため jsdom 不要）
 *
 * 🔵 青信号: 要件定義書 セクション2.1, 2.2, 4.2, 4.3、テストケース定義書 TC-001〜TC-023
 */

import { describe, expect, it } from 'vitest'

// 【インポート対象】: 新規作成予定のシステムファイルからエクスポート関数をインポート
// 【注意】: これらのファイルはまだ存在しないため、テストは全て失敗する（Redフェーズ）
import {
  isDescendantOfLevel,
  processLevelVisibility,
} from '../../systems/level-visibility-system'

import {
  resolveHoveredNodeId,
  resolveSelectionPath,
} from '../../systems/interactive-system'

// ─────────────────────────────────────────────
// テスト用ヘルパー: 最小限のノードオブジェクト生成
// ─────────────────────────────────────────────

type MinimalNode = {
  id: string
  type: string
  parentId: string | null
}

function makeNode(id: string, type: string, parentId: string | null): MinimalNode {
  return { id, type, parentId }
}

/** visible プロパティを持つモックObject3D */
function makeMockObject3D(parent?: { visible: boolean }) {
  const obj = { visible: true, parent: parent ?? null }
  return obj
}

// ─────────────────────────────────────────────
// 1. isDescendantOfLevel テスト
// ─────────────────────────────────────────────

describe('isDescendantOfLevel', () => {
  describe('TC-001: 直接の子ノード（parentId === levelId）で true を返す', () => {
    it('zone の parentId が levelId と一致する場合 true を返す', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.2 parentIdチェーン判定
      const nodes: Record<string, MinimalNode> = {
        level_001: makeNode('level_001', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
      }

      const result = isDescendantOfLevel('zone_001', 'level_001', nodes)
      expect(result).toBe(true)
    })
  })

  describe('TC-002: 孫ノード（zone配下のequipment）で true を返す', () => {
    it('ahu の親 zone が level の配下にある場合 true を返す', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.2 特殊ケース
      const nodes: Record<string, MinimalNode> = {
        level_001: makeNode('level_001', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
        ahu_001: makeNode('ahu_001', 'ahu', 'zone_001'),
      }

      const result = isDescendantOfLevel('ahu_001', 'level_001', nodes)
      expect(result).toBe(true)
    })
  })

  describe('TC-003: 別レベル配下のノードで false を返す', () => {
    it('別レベルの zone に対して false を返す', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.2 特殊ケース
      const nodes: Record<string, MinimalNode> = {
        level_001: makeNode('level_001', 'level', 'building_001'),
        level_002: makeNode('level_002', 'level', 'building_001'),
        zone_002: makeNode('zone_002', 'hvac_zone', 'level_002'),
      }

      const result = isDescendantOfLevel('zone_002', 'level_001', nodes)
      expect(result).toBe(false)
    })
  })

  describe('TC-004: parentId が null のノード（ルートノード）で false を返す', () => {
    it('plant ノード（parentId=null）に対して false を返す', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.2
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
      }

      const result = isDescendantOfLevel('plant_001', 'level_001', nodes)
      expect(result).toBe(false)
    })
  })

  describe('TC-005: 深いネスト（3段以上）で正しく辿る', () => {
    it('diffuser → ahu → zone → level の4段チェーンで true を返す', () => {
      // 🟡 黄信号: 要件定義書 セクション4.3 EDGE-05
      const nodes: Record<string, MinimalNode> = {
        level_001: makeNode('level_001', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
        ahu_001: makeNode('ahu_001', 'ahu', 'zone_001'),
        diffuser_001: makeNode('diffuser_001', 'diffuser', 'ahu_001'),
      }

      const result = isDescendantOfLevel('diffuser_001', 'level_001', nodes)
      expect(result).toBe(true)
    })
  })

  describe('TC-006: 存在しない nodeId で false を返す', () => {
    it('nodes に存在しない nodeId に対して false を返す', () => {
      // 🔵 青信号: 防御的プログラミング
      const nodes: Record<string, MinimalNode> = {
        level_001: makeNode('level_001', 'level', 'building_001'),
      }

      const result = isDescendantOfLevel('nonexistent', 'level_001', nodes)
      expect(result).toBe(false)
    })
  })

  describe('TC-007: 循環参照でも無限ループしない', () => {
    it('循環参照のあるノードに対して false を返す（最大深度制限）', () => {
      // 🟡 黄信号: 要件定義書 セクション4.3 EDGE-05
      const nodes: Record<string, MinimalNode> = {
        node_a: makeNode('node_a', 'ahu', 'node_b'),
        node_b: makeNode('node_b', 'ahu', 'node_a'),
      }

      const result = isDescendantOfLevel('node_a', 'level_001', nodes)
      expect(result).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────
// 2. processLevelVisibility テスト
// ─────────────────────────────────────────────

describe('processLevelVisibility', () => {
  describe('TC-008: levelId=null で全ノード visible=true', () => {
    it('レベル未選択時は全ノードを表示する', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.1 処理ロジック、セクション4.3 EDGE-01
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
      }

      const obj1 = makeMockObject3D()
      const obj2 = makeMockObject3D()
      const obj3 = makeMockObject3D()
      const obj4 = makeMockObject3D()
      // 初期状態で一部 visible=false にしておく
      obj3.visible = false
      obj4.visible = false

      const registryNodes = new Map<string, unknown>([
        ['plant_001', obj1],
        ['building_001', obj2],
        ['level_001', obj3],
        ['zone_001', obj4],
      ])

      processLevelVisibility(nodes, null, registryNodes)

      expect(obj1.visible).toBe(true)
      expect(obj2.visible).toBe(true)
      expect(obj3.visible).toBe(true)
      expect(obj4.visible).toBe(true)
    })
  })

  describe('TC-009: 選択レベル配下のノードのみ visible=true', () => {
    it('level_001 選択時に level_001 配下のみ表示される', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.1 処理ロジック、UC-01
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
        level_002: makeNode('level_002', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
        zone_002: makeNode('zone_002', 'hvac_zone', 'level_002'),
      }

      const objPlant = makeMockObject3D()
      const objBuilding = makeMockObject3D()
      const objLevel1 = makeMockObject3D()
      const objLevel2 = makeMockObject3D()
      const objZone1 = makeMockObject3D()
      const objZone2 = makeMockObject3D()

      const registryNodes = new Map<string, unknown>([
        ['plant_001', objPlant],
        ['building_001', objBuilding],
        ['level_001', objLevel1],
        ['level_002', objLevel2],
        ['zone_001', objZone1],
        ['zone_002', objZone2],
      ])

      processLevelVisibility(nodes, 'level_001', registryNodes)

      // plant/building は常に visible
      expect(objPlant.visible).toBe(true)
      expect(objBuilding.visible).toBe(true)
      // 選択レベルは visible
      expect(objLevel1.visible).toBe(true)
      // 非選択レベルは非表示
      expect(objLevel2.visible).toBe(false)
      // 選択レベル配下のゾーンは表示
      expect(objZone1.visible).toBe(true)
      // 非選択レベル配下のゾーンは非表示
      expect(objZone2.visible).toBe(false)
    })
  })

  describe('TC-010: plant/building ノードは常に visible=true', () => {
    it('レベル選択中でも空間ノードは常に表示される', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.1 空間ノード、セクション4.3 EDGE-06
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
      }

      const objPlant = makeMockObject3D()
      const objBuilding = makeMockObject3D()
      const objLevel = makeMockObject3D()

      const registryNodes = new Map<string, unknown>([
        ['plant_001', objPlant],
        ['building_001', objBuilding],
        ['level_001', objLevel],
      ])

      processLevelVisibility(nodes, 'level_001', registryNodes)

      expect(objPlant.visible).toBe(true)
      expect(objBuilding.visible).toBe(true)
    })
  })

  describe('TC-011: 選択レベル自体は visible=true、他レベルは visible=false', () => {
    it('選択中のレベルのみ visible で他レベルは非表示', () => {
      // 🔵 青信号: 要件定義書 セクション2.1.1 処理ロジック
      const nodes: Record<string, MinimalNode> = {
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
        level_002: makeNode('level_002', 'level', 'building_001'),
        level_003: makeNode('level_003', 'level', 'building_001'),
      }

      const objLevel1 = makeMockObject3D()
      const objLevel2 = makeMockObject3D()
      const objLevel3 = makeMockObject3D()

      const registryNodes = new Map<string, unknown>([
        ['level_001', objLevel1],
        ['level_002', objLevel2],
        ['level_003', objLevel3],
      ])

      processLevelVisibility(nodes, 'level_002', registryNodes)

      expect(objLevel1.visible).toBe(false)
      expect(objLevel2.visible).toBe(true)
      expect(objLevel3.visible).toBe(false)
    })
  })

  describe('TC-012: registryNodes に未登録のノードはスキップ', () => {
    it('registryNodes に登録されていないノードがあってもエラーにならない', () => {
      // 🔵 青信号: 要件定義書 セクション4.3 EDGE-02
      const nodes: Record<string, MinimalNode> = {
        level_001: makeNode('level_001', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
      }

      // zone_001 は registryNodes に未登録
      const objLevel = makeMockObject3D()
      const registryNodes = new Map<string, unknown>([
        ['level_001', objLevel],
      ])

      // エラーが発生しないことを確認
      expect(() => {
        processLevelVisibility(nodes, 'level_001', registryNodes)
      }).not.toThrow()
    })
  })

  describe('TC-013: レベル切替時に前レベル配下が非表示になる', () => {
    it('level_001 → level_002 切替で表示が正しく更新される', () => {
      // 🔵 青信号: 要件定義書 UC-02
      const nodes: Record<string, MinimalNode> = {
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
        level_002: makeNode('level_002', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
        zone_002: makeNode('zone_002', 'hvac_zone', 'level_002'),
      }

      const objLevel1 = makeMockObject3D()
      const objLevel2 = makeMockObject3D()
      const objZone1 = makeMockObject3D()
      const objZone2 = makeMockObject3D()

      const registryNodes = new Map<string, unknown>([
        ['level_001', objLevel1],
        ['level_002', objLevel2],
        ['zone_001', objZone1],
        ['zone_002', objZone2],
      ])

      // 1回目: level_001 選択
      processLevelVisibility(nodes, 'level_001', registryNodes)
      expect(objZone1.visible).toBe(true)
      expect(objZone2.visible).toBe(false)

      // 2回目: level_002 に切替
      processLevelVisibility(nodes, 'level_002', registryNodes)
      expect(objZone1.visible).toBe(false)
      expect(objZone2.visible).toBe(true)
      expect(objLevel1.visible).toBe(false)
      expect(objLevel2.visible).toBe(true)
    })
  })

  describe('TC-014: 空の registryNodes で正常動作', () => {
    it('registryNodes が空でもエラーにならない', () => {
      // 🔵 青信号: 防御的プログラミング
      const nodes: Record<string, MinimalNode> = {
        level_001: makeNode('level_001', 'level', 'building_001'),
      }

      const registryNodes = new Map<string, unknown>()

      expect(() => {
        processLevelVisibility(nodes, 'level_001', registryNodes)
      }).not.toThrow()
    })
  })
})

// ─────────────────────────────────────────────
// 3. resolveSelectionPath テスト
// ─────────────────────────────────────────────

describe('resolveSelectionPath', () => {
  describe('TC-015: equipment → hvac_zone → level → building → plant の完全パスを解決', () => {
    it('fcu から plant までの完全な SelectionPath を返す', () => {
      // 🟡 黄信号: 要件定義書 セクション2.2.3 resolveSelectionPath
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
        fcu_001: makeNode('fcu_001', 'fcu', 'zone_001'),
      }

      const result = resolveSelectionPath('fcu_001', nodes)

      expect(result.plantId).toBe('plant_001')
      expect(result.buildingId).toBe('building_001')
      expect(result.levelId).toBe('level_001')
      expect(result.zoneId).toBe('zone_001')
      expect(result.selectedIds).toEqual(['fcu_001'])
    })
  })

  describe('TC-016: level ノード直接選択時のパス解決', () => {
    it('level 選択時に levelId が設定され zoneId は null', () => {
      // 🟡 黄信号: 要件定義書 セクション2.2.3
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
      }

      const result = resolveSelectionPath('level_001', nodes)

      expect(result.plantId).toBe('plant_001')
      expect(result.buildingId).toBe('building_001')
      expect(result.levelId).toBe('level_001')
      expect(result.zoneId).toBeNull()
      expect(result.selectedIds).toEqual(['level_001'])
    })
  })

  describe('TC-017: hvac_zone ノード選択時のパス解決', () => {
    it('zone 選択時に zoneId が設定される', () => {
      // 🟡 黄信号: 要件定義書 セクション2.2.3
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
        building_001: makeNode('building_001', 'building', 'plant_001'),
        level_001: makeNode('level_001', 'level', 'building_001'),
        zone_001: makeNode('zone_001', 'hvac_zone', 'level_001'),
      }

      const result = resolveSelectionPath('zone_001', nodes)

      expect(result.plantId).toBe('plant_001')
      expect(result.buildingId).toBe('building_001')
      expect(result.levelId).toBe('level_001')
      expect(result.zoneId).toBe('zone_001')
      expect(result.selectedIds).toEqual(['zone_001'])
    })
  })

  describe('TC-018: building ノード選択時（levelId, zoneId は null）', () => {
    it('building 選択時に levelId と zoneId は null', () => {
      // 🟡 黄信号: 要件定義書 セクション2.2.3
      const nodes: Record<string, MinimalNode> = {
        plant_001: makeNode('plant_001', 'plant', null),
        building_001: makeNode('building_001', 'building', 'plant_001'),
      }

      const result = resolveSelectionPath('building_001', nodes)

      expect(result.plantId).toBe('plant_001')
      expect(result.buildingId).toBe('building_001')
      expect(result.levelId).toBeNull()
      expect(result.zoneId).toBeNull()
      expect(result.selectedIds).toEqual(['building_001'])
    })
  })

  describe('TC-019: 存在しない nodeId でデフォルトパスを返す', () => {
    it('存在しない nodeId に対して全て null の path と selectedIds を返す', () => {
      // 🔵 青信号: 防御的プログラミング
      const nodes: Record<string, MinimalNode> = {}

      const result = resolveSelectionPath('nonexistent', nodes)

      expect(result.plantId).toBeNull()
      expect(result.buildingId).toBeNull()
      expect(result.levelId).toBeNull()
      expect(result.zoneId).toBeNull()
      expect(result.selectedIds).toEqual(['nonexistent'])
    })
  })
})

// ─────────────────────────────────────────────
// 4. resolveHoveredNodeId テスト
// ─────────────────────────────────────────────

describe('resolveHoveredNodeId', () => {
  describe('TC-020: intersection.object から registryNodes を逆引きして nodeId を返す', () => {
    it('直接一致する Object3D から nodeId を解決する', () => {
      // 🟡 黄信号: 要件定義書 セクション2.2.1 ホバーハイライト
      const mockObj = makeMockObject3D()
      const registryNodes = new Map<string, unknown>([
        ['ahu_001', mockObj],
      ])

      const intersection = { object: mockObj }

      const result = resolveHoveredNodeId(intersection, registryNodes)
      expect(result).toBe('ahu_001')
    })
  })

  describe('TC-021: intersection.object の parent を辿って nodeId を返す', () => {
    it('子メッシュの parent が registryNodes に登録されている場合 nodeId を返す', () => {
      // 🟡 黄信号: 要件定義書 セクション2.2.1（Object3D parent 辿り）
      const parentGroup = makeMockObject3D()
      const childMesh = makeMockObject3D(parentGroup as { visible: boolean })

      const registryNodes = new Map<string, unknown>([
        ['ahu_001', parentGroup],
      ])

      const intersection = { object: childMesh }

      const result = resolveHoveredNodeId(intersection, registryNodes)
      expect(result).toBe('ahu_001')
    })
  })

  describe('TC-022: registryNodes に一致しない場合 null を返す', () => {
    it('どの registryNode にも一致しない Object3D に対して null を返す', () => {
      // 🟡 黄信号: 要件定義書 セクション4.3 EDGE-03
      const unknownMesh = makeMockObject3D()
      const registryNodes = new Map<string, unknown>([
        ['ahu_001', makeMockObject3D()],
      ])

      const intersection = { object: unknownMesh }

      const result = resolveHoveredNodeId(intersection, registryNodes)
      expect(result).toBeNull()
    })
  })

  describe('TC-023: intersection が null/undefined の場合 null を返す', () => {
    it('null intersection に対して null を返す', () => {
      // 🔵 青信号: 防御的プログラミング
      const registryNodes = new Map<string, unknown>()

      const result = resolveHoveredNodeId(null, registryNodes)
      expect(result).toBeNull()
    })
  })
})
