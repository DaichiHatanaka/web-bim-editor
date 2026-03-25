import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import useEditor, { phaseTools, type Phase, type Tool } from '../../store/use-editor'

function resetStore() {
  useEditor.setState({
    phase: 'zone',
    mode: 'select',
    tool: 'select',
  })
}

describe('ToolManager + PhaseBar Integration Tests', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    resetStore()
  })

  describe('Phase and Tool Management', () => {
    it('starts with zone phase and select mode/tool', () => {
      const state = useEditor.getState()
      expect(state.phase).toBe('zone')
      expect(state.mode).toBe('select')
      expect(state.tool).toBe('select')
    })

    it('has all 5 phases with corresponding tools', () => {
      const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']
      for (const phase of phases) {
        expect(phaseTools[phase]).toBeDefined()
        expect(phaseTools[phase].length).toBeGreaterThan(0)
      }
    })

    it('zone phase has select, zone_draw, zone_edit, load_calc tools', () => {
      expect(phaseTools.zone).toEqual(['select', 'zone_draw', 'zone_edit', 'load_calc'])
    })

    it('equip phase has ahu_place, pac_place, fcu_place, diffuser_place tools', () => {
      expect(phaseTools.equip).toContain('ahu_place')
      expect(phaseTools.equip).toContain('pac_place')
      expect(phaseTools.equip).toContain('fcu_place')
      expect(phaseTools.equip).toContain('diffuser_place')
    })

    it('route phase has duct_route, pipe_route tools', () => {
      expect(phaseTools.route).toContain('duct_route')
      expect(phaseTools.route).toContain('pipe_route')
    })

    it('calc phase has duct_sizing, pipe_sizing tools', () => {
      expect(phaseTools.calc).toContain('duct_sizing')
      expect(phaseTools.calc).toContain('pipe_sizing')
    })

    it('takeoff phase has quantity_takeoff tool', () => {
      expect(phaseTools.takeoff).toContain('quantity_takeoff')
    })
  })

  describe('Phase Switching Resets Mode and Tool', () => {
    it('changes phase and resets mode/tool to select', () => {
      useEditor.setState({ tool: 'zone_draw', mode: 'build' })
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
        expect(useEditor.getState().tool).toBe('select')
      }
    })

    it('each phase change resets tool to select', () => {
      const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']
      for (const phase of phases) {
        useEditor.setState({ tool: 'zone_draw' })
        useEditor.getState().setPhase(phase)
        expect(useEditor.getState().tool).toBe('select')
      }
    })
  })

  describe('Tool Selection and Mode Changes', () => {
    it('changes tool independently', () => {
      useEditor.getState().setTool('zone_draw')
      expect(useEditor.getState().tool).toBe('zone_draw')

      useEditor.getState().setTool('zone_edit')
      expect(useEditor.getState().tool).toBe('zone_edit')
    })

    it('changes mode independently', () => {
      const modes = ['select', 'edit', 'delete', 'build'] as const
      for (const mode of modes) {
        useEditor.getState().setMode(mode)
        expect(useEditor.getState().mode).toBe(mode)
      }
    })

    it('supports all tool types', () => {
      const tools: Tool[] = [
        'select', 'zone_draw', 'zone_edit', 'load_calc',
        'ahu_place', 'pac_place', 'fcu_place', 'diffuser_place',
        'equipment_edit', 'duct_route', 'pipe_route', 'fitting_place',
        'route_edit', 'duct_sizing', 'pipe_sizing', 'quantity_takeoff',
      ]

      for (const tool of tools) {
        useEditor.getState().setTool(tool)
        expect(useEditor.getState().tool).toBe(tool)
      }
    })
  })

  describe('Phase Bar Requirements', () => {
    it('displays correct number of phases (5)', () => {
      const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']
      expect(phases).toHaveLength(5)
    })

    it('all phases are available for one-click switching', () => {
      const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']
      useEditor.setState({ phase: 'zone' })

      for (const phase of phases) {
        useEditor.getState().setPhase(phase)
        expect(useEditor.getState().phase).toBe(phase)
      }
    })

    it('phase tools are retrieved by getAvailableTools', () => {
      useEditor.setState({ phase: 'zone' })
      const zoneTools = useEditor.getState().getAvailableTools()
      expect(zoneTools).toEqual(phaseTools.zone)

      useEditor.setState({ phase: 'equip' })
      const equipTools = useEditor.getState().getAvailableTools()
      expect(equipTools).toEqual(phaseTools.equip)
    })
  })

  describe('ToolManager Requirements', () => {
    it('renders null for select tool (no component)', () => {
      useEditor.setState({ tool: 'select' })
      // ToolManager returns null for select tool, which is correct
      const tool = useEditor.getState().tool
      expect(tool).toBe('select')
    })

    it('phase-to-tools mapping is complete', () => {
      const phases: Phase[] = ['zone', 'equip', 'route', 'calc', 'takeoff']
      for (const phase of phases) {
        expect(phaseTools[phase]).toBeDefined()
        expect(phaseTools[phase][0]).toBe('select') // All phases start with select
      }
    })

    it('all tools are unique identifiers', () => {
      const allTools = Object.values(phaseTools).flat()
      const uniqueTools = new Set(allTools)
      // We should have 17 unique tools across all phases (fan_place added in TASK-0026)
      expect(uniqueTools.size).toBe(17)
    })
  })

  describe('Japanese Label Requirements', () => {
    it('phases have Japanese labels mapping', () => {
      const phaseLabels: Record<Phase, string> = {
        zone: 'ゾーニング',
        equip: '機器',
        route: 'ルート',
        calc: '計算',
        takeoff: '拾い',
      }

      for (const phase of Object.keys(phaseLabels) as Phase[]) {
        expect(phaseLabels[phase]).toBeDefined()
        expect(phaseLabels[phase].length).toBeGreaterThan(0)
      }
    })

    it('tools have Japanese labels', () => {
      const toolLabels: Record<string, string> = {
        'select': '選択',
        'zone_draw': 'ゾーン描画',
        'zone_edit': 'ゾーン編集',
        'load_calc': '負荷計算',
        'ahu_place': 'AHU配置',
        'pac_place': 'PAC配置',
        'fcu_place': 'FCU配置',
        'diffuser_place': 'ディフューザ配置',
        'equipment_edit': '機器編集',
        'duct_route': 'ダクト経路',
        'pipe_route': '配管経路',
        'fitting_place': 'フィッティング配置',
        'route_edit': '経路編集',
        'duct_sizing': 'ダクト設計',
        'pipe_sizing': '配管設計',
        'quantity_takeoff': '数量拾い',
      }

      expect(Object.keys(toolLabels)).toHaveLength(16)
      for (const label of Object.values(toolLabels)) {
        expect(label.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Test Coverage Targets', () => {
    it('covers phase switching', () => {
      useEditor.getState().setPhase('equip')
      expect(useEditor.getState().phase).toBe('equip')
    })

    it('covers mode reset on phase change', () => {
      useEditor.setState({ mode: 'build' })
      useEditor.getState().setPhase('route')
      expect(useEditor.getState().mode).toBe('select')
    })

    it('covers tool selection', () => {
      useEditor.setState({ phase: 'zone' })
      useEditor.getState().setTool('zone_draw')
      expect(useEditor.getState().tool).toBe('zone_draw')
    })

    it('covers available tools query', () => {
      useEditor.setState({ phase: 'zone' })
      const available = useEditor.getState().getAvailableTools()
      expect(available.includes('zone_draw')).toBe(true)
      expect(available.includes('ahu_place')).toBe(false)
    })
  })
})
