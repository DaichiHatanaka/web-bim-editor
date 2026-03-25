import { create } from 'zustand'

// 5 phases for HVAC editor workflow
export type Phase = 'zone' | 'equip' | 'route' | 'calc' | 'takeoff'

export type Mode = 'select' | 'edit' | 'delete' | 'build'

// Tools available across phases
export type ZoneTool = 'select' | 'zone_draw' | 'zone_edit' | 'load_calc'
export type EquipTool = 'select' | 'ahu_place' | 'pac_place' | 'fcu_place' | 'diffuser_place' | 'fan_place' | 'equipment_edit'
export type RouteTool = 'select' | 'duct_route' | 'pipe_route' | 'fitting_place' | 'route_edit'
export type CalcTool = 'select' | 'duct_sizing' | 'pipe_sizing'
export type TakeoffTool = 'select' | 'quantity_takeoff'

export type Tool = ZoneTool | EquipTool | RouteTool | CalcTool | TakeoffTool

// Phase → available tools mapping
export const phaseTools: Record<Phase, readonly Tool[]> = {
  zone: ['select', 'zone_draw', 'zone_edit', 'load_calc'] as const,
  equip: ['select', 'ahu_place', 'pac_place', 'fcu_place', 'diffuser_place', 'fan_place', 'equipment_edit'] as const,
  route: ['select', 'duct_route', 'pipe_route', 'fitting_place', 'route_edit'] as const,
  calc: ['select', 'duct_sizing', 'pipe_sizing'] as const,
  takeoff: ['select', 'quantity_takeoff'] as const,
}

type EditorState = {
  phase: Phase
  setPhase: (phase: Phase) => void

  mode: Mode
  setMode: (mode: Mode) => void

  tool: Tool
  setTool: (tool: Tool) => void

  getAvailableTools: () => readonly Tool[]
}

const useEditor = create<EditorState>()((set, get) => ({
  phase: 'zone',
  setPhase: (phase) => {
    set({
      phase,
      mode: 'select',
      tool: 'select',
    })
  },

  mode: 'select',
  setMode: (mode) => set({ mode }),

  tool: 'select' as Tool,
  setTool: (tool) => set({ tool }),

  getAvailableTools: () => phaseTools[get().phase],
}))

export default useEditor
