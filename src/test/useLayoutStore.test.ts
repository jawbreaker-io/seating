import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLayoutStore } from '../useLayoutStore'
import { zones as defaultZones } from '../data'

describe('useLayoutStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with default zones when no localStorage', () => {
    const { result } = renderHook(() => useLayoutStore())
    expect(result.current.zones).toHaveLength(defaultZones.length)
    expect(result.current.zones.map((z) => z.id)).toEqual(
      defaultZones.map((z) => z.id),
    )
  })

  it('generates desks from zones', () => {
    const { result } = renderHook(() => useLayoutStore())
    const expectedDeskCount = defaultZones.reduce(
      (sum, z) => sum + z.rows * z.cols,
      0,
    )
    expect(result.current.desks).toHaveLength(expectedDeskCount)
  })

  it('loads zones from localStorage when available', () => {
    const customZones = [
      { id: 'z1', name: 'Custom Zone', color: '#fef3c7', rows: 1, cols: 2 },
    ]
    localStorage.setItem(
      'seating-chart-layout',
      JSON.stringify(customZones),
    )
    const { result } = renderHook(() => useLayoutStore())
    expect(result.current.zones).toHaveLength(1)
    expect(result.current.zones[0].name).toBe('Custom Zone')
  })

  describe('addZone', () => {
    it('adds a new zone', () => {
      const { result } = renderHook(() => useLayoutStore())
      const initialCount = result.current.zones.length

      act(() => {
        result.current.addZone('New Zone', '#fef3c7', 2, 2)
      })

      expect(result.current.zones).toHaveLength(initialCount + 1)
      const newZone = result.current.zones[result.current.zones.length - 1]
      expect(newZone.name).toBe('New Zone')
      expect(newZone.rows).toBe(2)
      expect(newZone.cols).toBe(2)
    })

    it('generates a unique zone ID', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.addZone('Zone A', '#fef3c7', 1, 1)
      })
      act(() => {
        result.current.addZone('Zone B', '#ffe4e6', 1, 1)
      })

      const ids = result.current.zones.map((z) => z.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('persists to localStorage', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.addZone('Persisted', '#fef3c7', 1, 1)
      })

      const stored = JSON.parse(
        localStorage.getItem('seating-chart-layout')!,
      )
      expect(stored.find((z: { name: string }) => z.name === 'Persisted')).toBeDefined()
    })
  })

  describe('updateZone', () => {
    it('updates zone properties', () => {
      const { result } = renderHook(() => useLayoutStore())
      const zoneId = result.current.zones[0].id

      act(() => {
        result.current.updateZone(zoneId, { name: 'Renamed', rows: 5 })
      })

      const updated = result.current.zones.find((z) => z.id === zoneId)!
      expect(updated.name).toBe('Renamed')
      expect(updated.rows).toBe(5)
    })

    it('regenerates desks when dimensions change', () => {
      const { result } = renderHook(() => useLayoutStore())
      const initialDesks = result.current.desks.length
      const zoneId = result.current.zones[0].id
      const oldZone = result.current.zones[0]

      act(() => {
        result.current.updateZone(zoneId, { rows: oldZone.rows + 1 })
      })

      expect(result.current.desks.length).toBe(
        initialDesks + oldZone.cols,
      )
    })
  })

  describe('removeZone', () => {
    it('removes a zone', () => {
      const { result } = renderHook(() => useLayoutStore())
      const initialCount = result.current.zones.length
      const zoneId = result.current.zones[0].id

      act(() => {
        result.current.removeZone(zoneId)
      })

      expect(result.current.zones).toHaveLength(initialCount - 1)
      expect(result.current.zones.find((z) => z.id === zoneId)).toBeUndefined()
    })

    it('removes desks belonging to the deleted zone', () => {
      const { result } = renderHook(() => useLayoutStore())
      const zoneId = result.current.zones[0].id

      act(() => {
        result.current.removeZone(zoneId)
      })

      const orphanDesks = result.current.desks.filter(
        (d) => d.zone === zoneId,
      )
      expect(orphanDesks).toHaveLength(0)
    })
  })

  describe('resetLayout', () => {
    it('restores default zones', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.removeZone(result.current.zones[0].id)
      })
      expect(result.current.zones.length).toBeLessThan(defaultZones.length)

      act(() => {
        result.current.resetLayout()
      })

      expect(result.current.zones).toHaveLength(defaultZones.length)
      expect(result.current.zones.map((z) => z.id)).toEqual(
        defaultZones.map((z) => z.id),
      )
    })
  })
})
