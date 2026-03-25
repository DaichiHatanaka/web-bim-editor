const DB_NAME = 'kuhl-scene-cache'
const DB_VERSION = 1
const STORE_NAME = 'scenes'

export type CachedSceneData = {
  nodes: Record<string, unknown>
  rootNodeIds: string[]
  collections: Record<string, unknown>
  version: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheScene(
  projectId: string,
  data: CachedSceneData
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(data, projectId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function loadCachedScene(
  projectId: string
): Promise<CachedSceneData | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(projectId)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function updateCache(
  projectId: string,
  data: CachedSceneData
): Promise<void> {
  return cacheScene(projectId, data)
}

export async function clearCache(projectId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(projectId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
