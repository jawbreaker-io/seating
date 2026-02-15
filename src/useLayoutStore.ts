import { useState, useMemo, useCallback } from 'react'
import type { Zone, Desk } from './types'
import { zones as defaultZones, generateDesks } from './data'

const LAYOUT_STORAGE_KEY = 'seating-chart-layout'

function nextZoneId(zones: Zone[]): string {
  const nums = zones
    .map((z) => parseInt(z.id.replace('z', ''), 10))
    .filter((n) => !isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `z${max + 1}`
}

function loadZones(): Zone[] {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Zone[]
  } catch {
    // fall through to default
  }
  return defaultZones.map((z) => ({ ...z }))
}

function saveZones(zones: Zone[]) {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(zones))
}

export function useLayoutStore() {
  const [zones, setZones] = useState<Zone[]>(loadZones)

  const desks: Desk[] = useMemo(() => generateDesks(zones), [zones])

  const updateZones = useCallback((next: Zone[]) => {
    setZones(next)
    saveZones(next)
  }, [])

  const addZone = useCallback(
    (name: string, color: string, rows: number, cols: number) => {
      setZones((prev) => {
        const next = [
          ...prev,
          { id: nextZoneId(prev), name, color, rows, cols },
        ]
        saveZones(next)
        return next
      })
    },
    [],
  )

  const updateZone = useCallback(
    (id: string, updates: Partial<Omit<Zone, 'id'>>) => {
      setZones((prev) => {
        const next = prev.map((z) =>
          z.id === id ? { ...z, ...updates } : z,
        )
        saveZones(next)
        return next
      })
    },
    [],
  )

  const removeZone = useCallback((id: string) => {
    setZones((prev) => {
      const next = prev.filter((z) => z.id !== id)
      saveZones(next)
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    const fresh = defaultZones.map((z) => ({ ...z }))
    updateZones(fresh)
  }, [updateZones])

  return {
    zones,
    desks,
    addZone,
    updateZone,
    removeZone,
    resetLayout,
  }
}
