/**
 * TASK-0032: MVP統合テスト - End-to-Endワークフロー
 *
 * テストケース: TC-032-001 ~ TC-032-007, TC-032-024, TC-032-025
 *
 * カバー範囲:
 *   - Plant → Building → Level → Zone → 負荷計算 → Equipment配置 → 保存
 *   - 既存読込 → 編集 → 再計算 → 再保存
 *   - データ整合性（parentId参照）
 *   - 自動保存 + キャッシュ連携
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useScene,
  clearSceneHistory,
  PlantNode,
  BuildingNode,
  LevelNode,
  HvacZoneNode,
  AhuNode,
  PacNode,
  DiffuserNode,
  processLoadCalc,
  type AnyNodeId,
} from '@kuhl/core'

// ─── DB モック ──────────────────────────────────────────────────────────────

function createChainMock(resolvedValue: unknown = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = ['select', 'insert', 'update', 'from', 'values', 'set', 'where', 'returning']
  for (const method of methods) {
    chain[method] = vi.fn(() => chain)
  }
  chain.returning = vi.fn(() => Promise.resolve(resolvedValue))
  return chain
}

const mockSceneBase = {
  id: 'scene-1',
  projectId: 'project-1',
  version: 1,
  nodes: {},
  rootNodeIds: [],
  collections: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockInsertChain = createChainMock([{ ...mockSceneBase, version: 1 }])
const mockUpdateChain = createChainMock([{ ...mockSceneBase, version: 4 }])
const mockFindFirst = vi.fn()
const mockUpdateCache = vi.fn().mockResolvedValue(undefined)

vi.mock('../../db', () => ({
  db: {
    query: {
      kuhlScenes: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    insert: vi.fn(() => mockInsertChain),
    update: vi.fn(() => mockUpdateChain),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => 'eq-condition'),
}))

vi.mock('../../lib/indexeddb-cache', () => ({
  updateCache: (...args: unknown[]) => mockUpdateCache(...args),
  cacheScene: vi.fn().mockResolvedValue(undefined),
  loadCachedScene: vi.fn().mockResolvedValue(null),
  clearCache: vi.fn().mockResolvedValue(undefined),
}))

import { saveScene, loadScene } from '../../lib/scene-persistence'
import { createAutoSave } from '../../lib/auto-save'

// ─── ヘルパー関数 ────────────────────────────────────────────────────────────

function resetScene() {
  useScene.getState().unloadScene()
  clearSceneHistory()
}

function buildHierarchy() {
  const { createNode } = useScene.getState()

  const plant = PlantNode.parse({ plantName: 'テストプラント' })
  createNode(plant)

  const building = BuildingNode.parse({ buildingName: 'テストビル' })
  createNode(building, plant.id)

  const level = LevelNode.parse({
    floorHeight: 3.0,
    ceilingHeight: 2.7,
    elevation: 0,
  })
  createNode(level, building.id)

  return { plant, building, level }
}

// ─── テスト ─────────────────────────────────────────────────────────────────

describe('TC-032-001: MVP ワークフロー E2E', () => {
  beforeEach(() => {
    resetScene()
    vi.clearAllMocks()
    mockFindFirst.mockResolvedValue(undefined)
    mockInsertChain.returning.mockResolvedValue([{ ...mockSceneBase, version: 1 }])
  })

  afterEach(() => {
    resetScene()
  })

  it('Plant → Building → Level が正しく格納される', () => {
    const { plant, building, level } = buildHierarchy()
    const { nodes } = useScene.getState()

    expect(nodes[plant.id]).toBeDefined()
    expect(nodes[building.id]).toBeDefined()
    expect(nodes[level.id]).toBeDefined()
    expect((nodes[building.id] as any).parentId).toBe(plant.id)
    expect((nodes[level.id] as any).parentId).toBe(building.id)
  })

  it('Zone作成後にdirtyNodesに追加される', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    expect(useScene.getState().dirtyNodes.has(zone.id)).toBe(true)
  })

  it('processLoadCalc でzone.loadResult が更新される', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    processLoadCalc()

    const updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult).toBeDefined()
    expect(updatedZone.loadResult!.coolingLoad).toBeCloseTo(15000, 0)
    expect(updatedZone.loadResult!.heatingLoad).toBeCloseTo(10000, 0)
  })

  it('AHU配置後にlevelのchildrenに含まれる', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const ahu = AhuNode.parse({
      tag: 'AHU-001',
      equipmentName: 'テストAHU',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: [2, 1.5, 1],
      lod: '100',
      status: 'planned',
    })
    createNode(ahu, level.id)

    const updatedLevel = useScene.getState().nodes[level.id] as LevelNode
    expect(updatedLevel.children).toContain(ahu.id)
    expect((useScene.getState().nodes[ahu.id] as any).parentId).toBe(level.id)
  })

  it('saveScene が正しいペイロードで呼ばれる', async () => {
    buildHierarchy()
    const { nodes, rootNodeIds } = useScene.getState()

    const result = await saveScene({
      sceneId: 'scene-1',
      projectId: 'project-1',
      nodes: nodes as Record<string, unknown>,
      rootNodeIds,
      collections: {},
    })

    expect(result).toBeDefined()
    expect(result!.version).toBeGreaterThanOrEqual(1)
  })
})

// ─── TC-032-002: 既存読込ワークフロー ────────────────────────────────────────

describe('TC-032-002: 既存読込ワークフロー', () => {
  beforeEach(() => {
    resetScene()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetScene()
  })

  it('loadScene → setScene → 全ノードがdirtyになる', async () => {
    const plant = PlantNode.parse({ plantName: 'テストプラント' })
    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })

    const existingNodes = {
      [plant.id]: plant,
      [zone.id]: zone,
    }

    mockFindFirst.mockResolvedValue({
      ...mockSceneBase,
      version: 3,
      nodes: existingNodes,
      rootNodeIds: [plant.id],
    })

    const scene = await loadScene('project-1')
    expect(scene).not.toBeNull()

    useScene.getState().setScene(
      scene!.nodes as Record<AnyNodeId, any>,
      scene!.rootNodeIds as AnyNodeId[]
    )

    const { dirtyNodes } = useScene.getState()
    for (const id of Object.keys(scene!.nodes)) {
      expect(dirtyNodes.has(id as AnyNodeId)).toBe(true)
    }
  })

  it('updateNode後にprocessLoadCalcで再計算される', () => {
    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })

    useScene.getState().setScene(
      { [zone.id]: zone } as Record<AnyNodeId, any>,
      []
    )

    // 初回計算
    processLoadCalc()
    let updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.coolingLoad).toBeCloseTo(15000, 0)

    // floorArea を変更
    useScene.getState().updateNode(zone.id, { floorArea: 200 } as any)
    processLoadCalc()

    updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.coolingLoad).toBeCloseTo(30000, 0)
  })
})

// ─── TC-032-003: Zone作成→processLoadCalc連携 ────────────────────────────────

describe('TC-032-003: Zone作成→processLoadCalc連携', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('meetingゾーン: coolingLoad=9000, heatingLoad=6000, dirtyが解消される', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-M',
      usage: 'meeting',
      floorArea: 50,
    })
    createNode(zone, level.id)

    expect(useScene.getState().dirtyNodes.has(zone.id)).toBe(true)

    processLoadCalc()

    const updatedZone = useScene.getState().nodes[zone.id] as HvacZoneNode
    expect(updatedZone.loadResult?.coolingLoad).toBeCloseTo(9000, 0)
    expect(updatedZone.loadResult?.heatingLoad).toBeCloseTo(6000, 0)
    expect(useScene.getState().dirtyNodes.has(zone.id)).toBe(false)
  })
})

// ─── TC-032-004: 複数Zone一括計算 ───────────────────────────────────────────

describe('TC-032-004: 複数Zone一括計算', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('5ゾーンを一括作成→processLoadCalc→全ゾーンのloadResultが計算済み', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const usages = ['office', 'meeting', 'server_room', 'lobby', 'corridor'] as const
    const zones = usages.map((usage, i) =>
      HvacZoneNode.parse({ zoneName: `Zone-${i}`, usage, floorArea: 100 })
    )

    for (const zone of zones) {
      createNode(zone, level.id)
    }

    processLoadCalc()

    const { nodes, dirtyNodes } = useScene.getState()
    for (const zone of zones) {
      const updated = nodes[zone.id] as HvacZoneNode
      expect(updated.loadResult).toBeDefined()
      expect(updated.loadResult?.coolingLoad).toBeGreaterThan(0)
      expect(dirtyNodes.has(zone.id)).toBe(false)
    }
  })
})

// ─── TC-032-005: Equipment配置と親子関係 ─────────────────────────────────────

describe('TC-032-005: Equipment配置と親子関係', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('AHU/PAC/Diffuserを配置し階層整合性を検証', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const ahu = AhuNode.parse({
      tag: 'AHU-001',
      equipmentName: 'AHU',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: [2, 1.5, 1],
      lod: '100',
      status: 'planned',
    })
    const pac = PacNode.parse({
      tag: 'PAC-001',
      equipmentName: 'PAC',
      position: [5, 0, 0],
      rotation: [0, 0, 0],
      dimensions: [1, 0.3, 0.8],
      lod: '100',
      status: 'planned',
      subType: 'ceiling_cassette',
    })
    const diffuser = DiffuserNode.parse({
      tag: 'DIFF-001',
      equipmentName: 'Diffuser',
      position: [2, 0, 0],
      rotation: [0, 0, 0],
      dimensions: [0.6, 0.1, 0.6],
      lod: '100',
      status: 'planned',
      subType: 'anemo',
    })

    createNode(ahu, level.id)
    createNode(pac, level.id)
    createNode(diffuser, level.id)

    const { nodes } = useScene.getState()
    const updatedLevel = nodes[level.id] as LevelNode

    expect(updatedLevel.children).toContain(ahu.id)
    expect(updatedLevel.children).toContain(pac.id)
    expect(updatedLevel.children).toContain(diffuser.id)

    expect((nodes[ahu.id] as any).parentId).toBe(level.id)
    expect((nodes[pac.id] as any).parentId).toBe(level.id)
    expect((nodes[diffuser.id] as any).parentId).toBe(level.id)
  })
})

// ─── TC-032-006: 保存→読込のラウンドトリップ ─────────────────────────────────

describe('TC-032-006: 保存→読込のラウンドトリップ', () => {
  beforeEach(() => {
    resetScene()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetScene()
  })

  it('saveScene→unloadScene→loadScene→setSceneでノード内容一致', async () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({
      zoneName: 'Zone-A',
      usage: 'office',
      floorArea: 100,
    })
    createNode(zone, level.id)

    const snapshotBefore = { ...useScene.getState().nodes }
    const rootNodeIdsBefore = [...useScene.getState().rootNodeIds]
    const savedNodes: Record<string, unknown> = JSON.parse(JSON.stringify(snapshotBefore))

    mockFindFirst.mockResolvedValueOnce(undefined)
    mockInsertChain.returning.mockResolvedValueOnce([{
      ...mockSceneBase,
      nodes: savedNodes,
      rootNodeIds: rootNodeIdsBefore,
      version: 1,
    }])

    await saveScene({
      sceneId: 'scene-1',
      projectId: 'project-1',
      nodes: snapshotBefore as Record<string, unknown>,
      rootNodeIds: rootNodeIdsBefore,
      collections: {},
    })

    useScene.getState().unloadScene()
    expect(Object.keys(useScene.getState().nodes)).toHaveLength(0)

    mockFindFirst.mockResolvedValueOnce({
      ...mockSceneBase,
      nodes: savedNodes,
      rootNodeIds: rootNodeIdsBefore,
      version: 1,
    })

    const scene = await loadScene('project-1')
    expect(scene).not.toBeNull()

    useScene.getState().setScene(
      scene!.nodes as Record<AnyNodeId, any>,
      scene!.rootNodeIds as AnyNodeId[]
    )

    const restoredNodes = useScene.getState().nodes
    const originalNodeIds = Object.keys(snapshotBefore)
    for (const id of originalNodeIds) {
      expect(restoredNodes[id as AnyNodeId]).toBeDefined()
    }
    expect(Object.keys(restoredNodes)).toHaveLength(originalNodeIds.length)
  })
})

// ─── TC-032-007: バージョンインクリメント ────────────────────────────────────

describe('TC-032-007: バージョンインクリメント', () => {
  beforeEach(() => {
    resetScene()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetScene()
  })

  it('既存シーン(version=3)に保存するとversion=4になる', async () => {
    mockFindFirst.mockResolvedValue({ ...mockSceneBase, version: 3 })
    mockUpdateChain.returning.mockResolvedValue([{ ...mockSceneBase, version: 4 }])

    const result = await saveScene({
      sceneId: 'scene-1',
      projectId: 'project-1',
      nodes: {},
      rootNodeIds: [],
      collections: {},
    })

    expect(result!.version).toBe(4)
  })
})

// ─── TC-032-024: データ整合性: parentId参照 ──────────────────────────────────

describe('TC-032-024: データ整合性: parentId参照', () => {
  beforeEach(() => {
    resetScene()
  })

  afterEach(() => {
    resetScene()
  })

  it('全ノードのparentIdが既存ノードを指し、rootNodeIdsはparentIdを持たない', () => {
    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()

    const zone = HvacZoneNode.parse({ zoneName: 'Zone-A', usage: 'office', floorArea: 100 })
    createNode(zone, level.id)

    const ahu = AhuNode.parse({
      tag: 'AHU-001',
      equipmentName: 'AHU',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: [2, 1.5, 1],
      lod: '100',
      status: 'planned',
    })
    createNode(ahu, level.id)

    const { nodes, rootNodeIds } = useScene.getState()

    for (const [_id, node] of Object.entries(nodes)) {
      const n = node as any
      if (n.parentId !== undefined) {
        expect(nodes[n.parentId as AnyNodeId]).toBeDefined()
      }
    }

    for (const rootId of rootNodeIds) {
      const rootNode = nodes[rootId] as any
      expect(rootNode.parentId).toBeUndefined()
    }
  })
})

// ─── TC-032-025: 自動保存+キャッシュ連携 ─────────────────────────────────────

describe('TC-032-025: 自動保存+キャッシュ連携', () => {
  beforeEach(() => {
    resetScene()
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockFindFirst.mockResolvedValue(undefined)
    mockInsertChain.returning.mockResolvedValue([{ ...mockSceneBase, version: 1 }])
    mockUpdateCache.mockResolvedValue(undefined)
  })

  afterEach(() => {
    resetScene()
    vi.useRealTimers()
  })

  it('trigger→5秒後にsaveSceneとupdateCacheが呼ばれる', async () => {
    const autoSave = createAutoSave({
      sceneId: 'scene-1',
      projectId: 'project-1',
    })

    const { level } = buildHierarchy()
    const { createNode } = useScene.getState()
    const zone = HvacZoneNode.parse({ zoneName: 'Zone-A', usage: 'office', floorArea: 100 })
    createNode(zone, level.id)
    processLoadCalc()

    const { nodes, rootNodeIds } = useScene.getState()

    autoSave.trigger({
      nodes: nodes as Record<string, unknown>,
      rootNodeIds,
      collections: {},
    })

    await vi.advanceTimersByTimeAsync(5000)

    // DBのinsertまたはupdateが呼ばれている
    const { db } = await import('../../db')
    const insertCalled = (db.insert as any).mock?.calls?.length ?? 0
    const updateCalled = (db.update as any).mock?.calls?.length ?? 0
    expect(insertCalled + updateCalled).toBeGreaterThanOrEqual(1)

    // updateCacheも呼ばれている
    expect(mockUpdateCache).toHaveBeenCalledTimes(1)
  })
})
