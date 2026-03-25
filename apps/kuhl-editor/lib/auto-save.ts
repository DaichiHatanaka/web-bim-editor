import { saveScene } from './scene-persistence'
import { updateCache } from './indexeddb-cache'

const AUTO_SAVE_DELAY = 5000 // 5秒

type AutoSaveOptions = {
  sceneId: string
  projectId: string
}

type SceneData = {
  nodes: Record<string, unknown>
  rootNodeIds: string[]
  collections: Record<string, unknown>
}

export function createAutoSave(options: AutoSaveOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let isSaving = false
  let pendingData: SceneData | null = null

  async function doSave(data: SceneData) {
    if (isSaving) {
      pendingData = data
      return
    }

    isSaving = true
    try {
      const result = await saveScene({
        sceneId: options.sceneId,
        projectId: options.projectId,
        nodes: data.nodes,
        rootNodeIds: data.rootNodeIds,
        collections: data.collections,
      })

      // IndexedDBキャッシュも更新
      await updateCache(options.projectId, {
        nodes: data.nodes,
        rootNodeIds: data.rootNodeIds,
        collections: data.collections,
        version: result.version,
      })
    } finally {
      isSaving = false
    }

    // 保存中に蓄積された変更があれば再度保存
    if (pendingData) {
      const next = pendingData
      pendingData = null
      await doSave(next)
    }
  }

  function trigger(data: SceneData) {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      doSave(data)
    }, AUTO_SAVE_DELAY)
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { trigger, cancel }
}
