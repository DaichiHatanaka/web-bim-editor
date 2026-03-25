import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SelectionPath = {
  plantId: string | null
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: string[]
}

export type LodLevel = 'low' | 'medium' | 'high'

type ViewerState = {
  selection: SelectionPath
  hoveredId: string | null
  setHoveredId: (id: string | null) => void

  cameraMode: 'perspective' | 'orthographic'
  setCameraMode: (mode: 'perspective' | 'orthographic') => void

  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  showGrid: boolean
  toggleGrid: () => void
  setShowGrid: (show: boolean) => void

  showAxes: boolean
  toggleAxes: () => void
  setShowAxes: (show: boolean) => void

  showLabels: boolean
  toggleLabels: () => void
  setShowLabels: (show: boolean) => void

  lod: LodLevel
  setLod: (lod: LodLevel) => void

  // Selection with hierarchy guard
  setSelection: (updates: Partial<SelectionPath>) => void
  resetSelection: () => void

  // Outliner arrays (mutated in-place by SelectionManager)
  outliner: {
    selectedObjects: unknown[]
    hoveredObjects: unknown[]
  }

  cameraDragging: boolean
  setCameraDragging: (dragging: boolean) => void
}

const defaultSelection: SelectionPath = {
  plantId: null,
  buildingId: null,
  levelId: null,
  zoneId: null,
  selectedIds: [],
}

const useViewer = create<ViewerState>()(
  persist(
    (set) => ({
      selection: { ...defaultSelection },
      hoveredId: null,
      setHoveredId: (id) => set({ hoveredId: id }),

      cameraMode: 'perspective',
      setCameraMode: (mode) => set({ cameraMode: mode }),

      theme: 'light',
      setTheme: (theme) => set({ theme }),

      showGrid: true,
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      setShowGrid: (show) => set({ showGrid: show }),

      showAxes: true,
      toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),
      setShowAxes: (show) => set({ showAxes: show }),

      showLabels: true,
      toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
      setShowLabels: (show) => set({ showLabels: show }),

      lod: 'medium',
      setLod: (lod) => set({ lod }),

      setSelection: (updates) =>
        set((state) => {
          const newSelection = { ...state.selection, ...updates }

          // Hierarchy Guard: Plant → Building → Level → Zone → Elements
          if (updates.plantId !== undefined) {
            if (updates.buildingId === undefined) newSelection.buildingId = null
            if (updates.levelId === undefined) newSelection.levelId = null
            if (updates.zoneId === undefined) newSelection.zoneId = null
            if (updates.selectedIds === undefined) newSelection.selectedIds = []
          }
          if (updates.buildingId !== undefined) {
            if (updates.levelId === undefined) newSelection.levelId = null
            if (updates.zoneId === undefined) newSelection.zoneId = null
            if (updates.selectedIds === undefined) newSelection.selectedIds = []
          }
          if (updates.levelId !== undefined) {
            if (updates.zoneId === undefined) newSelection.zoneId = null
            if (updates.selectedIds === undefined) newSelection.selectedIds = []
          }
          if (updates.zoneId !== undefined) {
            if (updates.selectedIds === undefined) newSelection.selectedIds = []
          }

          return { selection: newSelection }
        }),

      resetSelection: () =>
        set({ selection: { ...defaultSelection } }),

      outliner: { selectedObjects: [], hoveredObjects: [] },

      cameraDragging: false,
      setCameraDragging: (dragging) => set({ cameraDragging: dragging }),
    }),
    {
      name: 'kuhl-viewer-preferences',
      partialize: (state) => ({
        cameraMode: state.cameraMode,
        theme: state.theme,
        lod: state.lod,
      }),
    },
  ),
)

export default useViewer
