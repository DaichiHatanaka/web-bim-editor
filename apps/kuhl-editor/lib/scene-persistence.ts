import { eq } from 'drizzle-orm'
import { db } from '../db'
import { kuhlScenes } from '../db/schema'

export type ScenePersistenceOptions = {
  sceneId: string
  projectId: string
  nodes: Record<string, unknown>
  rootNodeIds: string[]
  collections: Record<string, unknown>
}

export async function saveScene(options: ScenePersistenceOptions) {
  const existing = await db.query.kuhlScenes.findFirst({
    where: eq(kuhlScenes.id, options.sceneId),
  })

  const nextVersion = existing ? existing.version + 1 : 1

  if (existing) {
    const [updated] = await db
      .update(kuhlScenes)
      .set({
        nodes: options.nodes,
        rootNodeIds: options.rootNodeIds,
        collections: options.collections,
        version: nextVersion,
      })
      .where(eq(kuhlScenes.id, options.sceneId))
      .returning()

    return updated
  }

  const [created] = await db
    .insert(kuhlScenes)
    .values({
      id: options.sceneId,
      projectId: options.projectId,
      nodes: options.nodes,
      rootNodeIds: options.rootNodeIds,
      collections: options.collections,
      version: nextVersion,
    })
    .returning()

  return created
}

export async function loadScene(projectId: string) {
  const scene = await db.query.kuhlScenes.findFirst({
    where: eq(kuhlScenes.projectId, projectId),
  })

  return scene ?? null
}

export async function createScene(projectId: string) {
  const [scene] = await db
    .insert(kuhlScenes)
    .values({
      projectId,
      nodes: {},
      rootNodeIds: [],
      collections: {},
      version: 1,
    })
    .returning()

  return scene
}
