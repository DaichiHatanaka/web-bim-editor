export function calculatePerimeter(points: Array<[number, number]>): number {
  if (points.length < 2) return 0

  let perimeter = 0

  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i]!
    const [x2, z2] = points[(i + 1) % points.length]!
    perimeter += Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2)
  }

  return perimeter
}

export function calculatePolygonArea(polygon: Array<[number, number]>): number {
  if (polygon.length < 3) return 0

  let area = 0
  const pointCount = polygon.length

  for (let i = 0; i < pointCount; i++) {
    const nextIndex = (i + 1) % pointCount
    area += polygon[i]![0] * polygon[nextIndex]![1]
    area -= polygon[nextIndex]![0] * polygon[i]![1]
  }

  return Math.abs(area) / 2
}

export function formatPolygonAreaName(label: string, polygon: Array<[number, number]>) {
  return `${label} (${calculatePolygonArea(polygon).toFixed(1)}m²)`
}
