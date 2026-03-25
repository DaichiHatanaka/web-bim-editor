/**
 * ZoneDrawTool 純粋関数ユーティリティ
 * R3F/Three.js 非依存。jsdom 環境でテスト可能。
 */

/**
 * Shoelace formula（ガウスの面積公式）でポリゴン面積を算出する。
 * A = 0.5 * |Σ(x_i * z_{i+1} - x_{i+1} * z_i)|
 * 頂点の巡回方向（時計回り/反時計回り）に依存せず正の値を返す。
 *
 * @param vertices - ポリゴン頂点配列 [[x, z], ...]
 * @returns 面積 (m²)。頂点が3点未満の場合は0。
 */
export function calculatePolygonArea(vertices: [number, number][]): number {
  const n = vertices.length
  if (n < 3) return 0

  let sum = 0
  for (let i = 0; i < n; i++) {
    const [xi, zi] = vertices[i]
    const [xNext, zNext] = vertices[(i + 1) % n]
    sum += xi * zNext - xNext * zi
  }

  return Math.abs(sum) * 0.5
}

/**
 * ポリゴンが有効かどうかを検証する。
 * 有効条件: Array.isArray かつ length >= 3
 *
 * @param vertices - 検証対象（unknown を受け付けてガードする）
 * @returns 有効な場合 true、それ以外は false
 */
export function isValidPolygon(vertices: unknown): boolean {
  return Array.isArray(vertices) && vertices.length >= 3
}

/**
 * クリック座標をグリッドにスナップする。
 * Math.round(value / gridSize) * gridSize
 *
 * @param point - スナップ前の座標 [x, z]
 * @param gridSize - グリッドサイズ（デフォルト 0.5 = 500mm グリッド）
 * @returns スナップ後の座標 [x, z]
 */
export function snapToGrid(point: [number, number], gridSize = 0.5): [number, number] {
  return [
    Math.round(point[0] / gridSize) * gridSize,
    Math.round(point[1] / gridSize) * gridSize,
  ]
}
