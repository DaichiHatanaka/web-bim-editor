import { eq } from 'drizzle-orm'
import { db } from '../db'
import { kuhlProjects } from '../db/schema'

export async function listProjects(ownerId: string) {
  return db.query.kuhlProjects.findMany({
    where: eq(kuhlProjects.ownerId, ownerId),
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  })
}

export async function createProject(data: {
  name: string
  description?: string
  ownerId: string
}) {
  const [project] = await db
    .insert(kuhlProjects)
    .values({
      name: data.name,
      description: data.description ?? null,
      ownerId: data.ownerId,
    })
    .returning()

  return project
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string }
) {
  const [project] = await db
    .update(kuhlProjects)
    .set(data)
    .where(eq(kuhlProjects.id, id))
    .returning()

  return project
}

export async function deleteProject(id: string) {
  await db.delete(kuhlProjects).where(eq(kuhlProjects.id, id))
}
