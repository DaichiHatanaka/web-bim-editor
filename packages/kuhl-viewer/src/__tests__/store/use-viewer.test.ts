import { afterEach, describe, expect, it } from 'vitest'
import useViewer from '../../store/use-viewer'

function resetStore() {
  useViewer.setState({
    selection: { plantId: null, buildingId: null, levelId: null, zoneId: null, selectedIds: [] },
    hoveredId: null,
    cameraMode: 'perspective',
    theme: 'light',
    showGrid: true,
    showAxes: true,
    showLabels: true,
    lod: 'medium',
    cameraDragging: false,
  })
}

describe('useViewer store', () => {
  afterEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('starts with default selection', () => {
      const { selection } = useViewer.getState()
      expect(selection.plantId).toBeNull()
      expect(selection.buildingId).toBeNull()
      expect(selection.levelId).toBeNull()
      expect(selection.zoneId).toBeNull()
      expect(selection.selectedIds).toEqual([])
    })

    it('starts with default display toggles', () => {
      const state = useViewer.getState()
      expect(state.showGrid).toBe(true)
      expect(state.showAxes).toBe(true)
      expect(state.showLabels).toBe(true)
    })
  })

  describe('SelectionPath hierarchy guard', () => {
    it('resets children when plantId changes', () => {
      useViewer.getState().setSelection({
        plantId: 'plant_a',
        buildingId: 'building_a',
        levelId: 'level_a',
        zoneId: 'zone_a',
        selectedIds: ['ahu_001'],
      })

      useViewer.getState().setSelection({ plantId: 'plant_b' })

      const { selection } = useViewer.getState()
      expect(selection.plantId).toBe('plant_b')
      expect(selection.buildingId).toBeNull()
      expect(selection.levelId).toBeNull()
      expect(selection.zoneId).toBeNull()
      expect(selection.selectedIds).toEqual([])
    })

    it('resets level/zone/selected when buildingId changes', () => {
      useViewer.getState().setSelection({
        buildingId: 'building_a',
        levelId: 'level_a',
        zoneId: 'zone_a',
        selectedIds: ['ahu_001'],
      })

      useViewer.getState().setSelection({ buildingId: 'building_b' })

      const { selection } = useViewer.getState()
      expect(selection.buildingId).toBe('building_b')
      expect(selection.levelId).toBeNull()
      expect(selection.zoneId).toBeNull()
      expect(selection.selectedIds).toEqual([])
    })

    it('resets zone/selected when levelId changes', () => {
      useViewer.getState().setSelection({
        levelId: 'level_a',
        zoneId: 'zone_a',
        selectedIds: ['ahu_001'],
      })

      useViewer.getState().setSelection({ levelId: 'level_b' })

      const { selection } = useViewer.getState()
      expect(selection.levelId).toBe('level_b')
      expect(selection.zoneId).toBeNull()
      expect(selection.selectedIds).toEqual([])
    })

    it('resets selectedIds when zoneId changes', () => {
      useViewer.getState().setSelection({
        zoneId: 'zone_a',
        selectedIds: ['ahu_001'],
      })

      useViewer.getState().setSelection({ zoneId: 'zone_b' })

      const { selection } = useViewer.getState()
      expect(selection.zoneId).toBe('zone_b')
      expect(selection.selectedIds).toEqual([])
    })

    it('allows explicit child override during parent change', () => {
      useViewer.getState().setSelection({
        buildingId: 'building_b',
        levelId: 'level_keep',
      })

      const { selection } = useViewer.getState()
      expect(selection.buildingId).toBe('building_b')
      expect(selection.levelId).toBe('level_keep')
    })
  })

  describe('resetSelection', () => {
    it('resets all selection fields', () => {
      useViewer.getState().setSelection({
        plantId: 'plant_a',
        buildingId: 'building_a',
        levelId: 'level_a',
        zoneId: 'zone_a',
        selectedIds: ['ahu_001'],
      })

      useViewer.getState().resetSelection()

      const { selection } = useViewer.getState()
      expect(selection.plantId).toBeNull()
      expect(selection.buildingId).toBeNull()
      expect(selection.levelId).toBeNull()
      expect(selection.zoneId).toBeNull()
      expect(selection.selectedIds).toEqual([])
    })
  })

  describe('display toggles', () => {
    it('toggleGrid flips value', () => {
      expect(useViewer.getState().showGrid).toBe(true)
      useViewer.getState().toggleGrid()
      expect(useViewer.getState().showGrid).toBe(false)
      useViewer.getState().toggleGrid()
      expect(useViewer.getState().showGrid).toBe(true)
    })

    it('toggleAxes flips value', () => {
      useViewer.getState().toggleAxes()
      expect(useViewer.getState().showAxes).toBe(false)
    })

    it('toggleLabels flips value', () => {
      useViewer.getState().toggleLabels()
      expect(useViewer.getState().showLabels).toBe(false)
    })
  })

  describe('camera mode', () => {
    it('switches camera mode', () => {
      useViewer.getState().setCameraMode('orthographic')
      expect(useViewer.getState().cameraMode).toBe('orthographic')
    })
  })

  describe('theme', () => {
    it('switches theme', () => {
      useViewer.getState().setTheme('dark')
      expect(useViewer.getState().theme).toBe('dark')
    })
  })

  describe('LOD', () => {
    it('changes LOD level', () => {
      useViewer.getState().setLod('high')
      expect(useViewer.getState().lod).toBe('high')
      useViewer.getState().setLod('low')
      expect(useViewer.getState().lod).toBe('low')
    })
  })

  describe('hover', () => {
    it('sets and clears hovered ID', () => {
      useViewer.getState().setHoveredId('ahu_001')
      expect(useViewer.getState().hoveredId).toBe('ahu_001')
      useViewer.getState().setHoveredId(null)
      expect(useViewer.getState().hoveredId).toBeNull()
    })
  })
})
