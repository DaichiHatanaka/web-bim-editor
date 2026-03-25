import { describe, expect, it } from 'vitest'
import { BaseNode, CameraSchema, generateId, nodeType, objectId } from '../../schema/base'

describe('objectId', () => {
  it('generates a prefixed ID with the given prefix', () => {
    const schema = objectId('ahu')
    const result = schema.parse(undefined)
    expect(result).toMatch(/^ahu_[a-z0-9]+$/)
  })

  it('accepts a valid prefixed ID', () => {
    const schema = objectId('ahu')
    const result = schema.parse('ahu_abc123')
    expect(result).toBe('ahu_abc123')
  })

  it('rejects an ID with wrong prefix', () => {
    const schema = objectId('ahu')
    expect(() => schema.parse('pac_abc123')).toThrow()
  })
})

describe('generateId', () => {
  it('returns a string starting with the prefix', () => {
    const id = generateId('ahu')
    expect(id).toMatch(/^ahu_[a-z0-9]{16}$/)
  })
})

describe('nodeType', () => {
  it('returns a schema defaulting to the given literal', () => {
    const schema = nodeType('ahu')
    const result = schema.parse(undefined)
    expect(result).toBe('ahu')
  })

  it('accepts the exact literal value', () => {
    const schema = nodeType('ahu')
    expect(schema.parse('ahu')).toBe('ahu')
  })

  it('rejects a different value', () => {
    const schema = nodeType('ahu')
    expect(() => schema.parse('pac')).toThrow()
  })
})

describe('CameraSchema', () => {
  it('parses valid camera data', () => {
    const result = CameraSchema.parse({
      position: [1, 2, 3],
      target: [4, 5, 6],
    })
    expect(result.position).toEqual([1, 2, 3])
    expect(result.target).toEqual([4, 5, 6])
    expect(result.mode).toBe('perspective')
  })

  it('accepts optional zoom and fov', () => {
    const result = CameraSchema.parse({
      position: [0, 0, 0],
      target: [0, 0, 0],
      zoom: 2,
      fov: 75,
    })
    expect(result.zoom).toBe(2)
    expect(result.fov).toBe(75)
  })

  it('rejects invalid position tuple', () => {
    expect(() =>
      CameraSchema.parse({
        position: [1, 2],
        target: [0, 0, 0],
      }),
    ).toThrow()
  })
})

describe('BaseNode', () => {
  it('parses valid node data with defaults', () => {
    const result = BaseNode.parse({
      id: 'node_abc123',
    })
    expect(result.object).toBe('node')
    expect(result.type).toBe('node')
    expect(result.id).toBe('node_abc123')
    expect(result.parentId).toBeNull()
    expect(result.visible).toBe(true)
    expect(result.metadata).toEqual({})
  })

  it('parses node with all fields', () => {
    const result = BaseNode.parse({
      id: 'node_xyz',
      name: 'Test Node',
      parentId: 'node_parent',
      visible: false,
      camera: { position: [1, 2, 3], target: [4, 5, 6] },
      metadata: { key: 'value' },
    })
    expect(result.name).toBe('Test Node')
    expect(result.parentId).toBe('node_parent')
    expect(result.visible).toBe(false)
    expect(result.camera).toBeDefined()
  })

  it('rejects missing id', () => {
    expect(() => BaseNode.parse({})).toThrow()
  })
})
