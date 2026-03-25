import { afterEach, describe, expect, it } from 'vitest'
import useEditor, { phaseTools, type Phase } from '../../store/use-editor'

function resetStore() {
  useEditor.setState({
    phase: 'zone',
    mode: 'select',
    tool: 'select',
  })
}

describe('useEditor store', () => {
  afterEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('starts with zone phase and select mode/tool', () => {
      const state = useEditor.getState()
      expect(state.phase).toBe('zone')
      expect(state.mode).toBe('select')
      expect(state.tool).toBe('select')
    })
  })

  describe('setPhase', () => {
    it('changes phase and resets mode/tool to select', () => {
      useEditor.getState().setTool('zone_draw')
      useEditor.getState().setMode('build')

      useEditor.getState().setPhase('equip')

      const state = useEditor.getState()
      expect(state.phase).toBe('equip')
      expect(state.mode).toBe('select')
      expect(state.tool).toBe('select')
    })

    it('switches to all 5 phases', () => {
      const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']
      for (const phase of phases) {
        useEditor.getState().setPhase(phase)
        expect(useEditor.getState().phase).toBe(phase)
      }
    })
  })

  describe('setMode', () => {
    it('changes mode', () => {
      useEditor.getState().setMode('build')
      expect(useEditor.getState().mode).toBe('build')
    })

    it('switches between all modes', () => {
      const modes = ['select', 'edit', 'delete', 'build'] as const
      for (const mode of modes) {
        useEditor.getState().setMode(mode)
        expect(useEditor.getState().mode).toBe(mode)
      }
    })
  })

  describe('setTool', () => {
    it('changes tool', () => {
      useEditor.getState().setTool('zone_draw')
      expect(useEditor.getState().tool).toBe('zone_draw')
    })
  })

  describe('phaseTools mapping', () => {
    it('zone phase has correct tools', () => {
      expect(phaseTools.zone).toEqual(['select', 'zone_draw', 'zone_edit', 'load_calc'])
    })

    it('equip phase has correct tools', () => {
      expect(phaseTools.equip).toEqual([
        'select', 'ahu_place', 'pac_place', 'fcu_place', 'diffuser_place', 'fan_place', 'equipment_edit',
      ])
    })

    it('route phase has correct tools', () => {
      expect(phaseTools.route).toEqual([
        'select', 'duct_route', 'pipe_route', 'fitting_place', 'route_edit',
      ])
    })

    it('calc phase has correct tools', () => {
      expect(phaseTools.calc).toEqual(['select', 'duct_sizing', 'pipe_sizing'])
    })

    it('takeoff phase has correct tools', () => {
      expect(phaseTools.takeoff).toEqual(['select', 'quantity_takeoff'])
    })

    it('all phases have select as first tool', () => {
      for (const phase of Object.keys(phaseTools) as Phase[]) {
        expect(phaseTools[phase][0]).toBe('select')
      }
    })

    it('total unique tools across all phases is 17', () => {
      const allTools = new Set(Object.values(phaseTools).flat())
      expect(allTools.size).toBe(17)
    })
  })

  describe('getAvailableTools', () => {
    it('returns tools for current phase', () => {
      useEditor.getState().setPhase('zone')
      expect(useEditor.getState().getAvailableTools()).toEqual(phaseTools.zone)
    })

    it('updates when phase changes', () => {
      useEditor.getState().setPhase('equip')
      expect(useEditor.getState().getAvailableTools()).toEqual(phaseTools.equip)

      useEditor.getState().setPhase('route')
      expect(useEditor.getState().getAvailableTools()).toEqual(phaseTools.route)
    })
  })
})
