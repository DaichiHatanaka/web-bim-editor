import { describe, expect, it, vi } from 'vitest'
import { emitter, eventKey, eventSuffixes, type KuhlEvents, type NodeEvent } from '../../events/bus'

describe('Event bus', () => {
  afterEach(() => {
    emitter.all.clear()
  })

  describe('emitter', () => {
    it('fires and receives events', () => {
      const handler = vi.fn()
      emitter.on('ahu:click', handler)

      const event = {
        node: { id: 'ahu_test', type: 'ahu' },
        position: [0, 0, 0],
        localPosition: [0, 0, 0],
        stopPropagation: () => {},
        nativeEvent: {},
      } as unknown as NodeEvent

      emitter.emit('ahu:click', event)
      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('unsubscribes correctly', () => {
      const handler = vi.fn()
      emitter.on('pac:click', handler)
      emitter.off('pac:click', handler)

      emitter.emit('pac:click', {} as any)
      expect(handler).not.toHaveBeenCalled()
    })

    it('supports multiple handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      emitter.on('fcu:enter', handler1)
      emitter.on('fcu:enter', handler2)

      emitter.emit('fcu:enter', {} as any)
      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })
  })

  describe('event suffixes', () => {
    it('contains all expected suffixes', () => {
      expect(eventSuffixes).toContain('click')
      expect(eventSuffixes).toContain('move')
      expect(eventSuffixes).toContain('enter')
      expect(eventSuffixes).toContain('leave')
      expect(eventSuffixes).toContain('pointerdown')
      expect(eventSuffixes).toContain('pointerup')
      expect(eventSuffixes).toContain('context-menu')
      expect(eventSuffixes).toContain('double-click')
      expect(eventSuffixes).toHaveLength(8)
    })
  })

  describe('eventKey helper', () => {
    it('builds correct key', () => {
      expect(eventKey('ahu', 'click')).toBe('ahu:click')
      expect(eventKey('duct_segment', 'move')).toBe('duct_segment:move')
      expect(eventKey('hvac_zone', 'enter')).toBe('hvac_zone:enter')
    })
  })

  describe('node type events', () => {
    const nodeTypes = [
      'plant', 'building', 'level', 'hvac_zone',
      'ahu', 'pac', 'fcu', 'vrf_outdoor', 'vrf_indoor',
      'diffuser', 'damper', 'fan', 'pump', 'chiller',
      'boiler', 'cooling_tower', 'valve',
      'duct_segment', 'duct_fitting', 'pipe_segment', 'pipe_fitting',
      'system', 'support', 'architecture_ref',
    ] as const

    for (const nodeType of nodeTypes) {
      it(`emits ${nodeType}:click event`, () => {
        const handler = vi.fn()
        const key = `${nodeType}:click` as keyof KuhlEvents
        emitter.on(key, handler)

        emitter.emit(key, {} as any)
        expect(handler).toHaveBeenCalledOnce()

        emitter.off(key, handler)
      })
    }
  })

  describe('camera control events', () => {
    it('emits camera-controls:view', () => {
      const handler = vi.fn()
      emitter.on('camera-controls:view', handler)
      emitter.emit('camera-controls:view', { nodeId: 'ahu_test' })
      expect(handler).toHaveBeenCalledWith({ nodeId: 'ahu_test' })
    })

    it('emits camera-controls:top-view', () => {
      const handler = vi.fn()
      emitter.on('camera-controls:top-view', handler)
      emitter.emit('camera-controls:top-view', undefined)
      expect(handler).toHaveBeenCalledOnce()
    })
  })

  describe('tool events', () => {
    it('emits tool:cancel', () => {
      const handler = vi.fn()
      emitter.on('tool:cancel', handler)
      emitter.emit('tool:cancel', undefined)
      expect(handler).toHaveBeenCalledOnce()
    })
  })
})
