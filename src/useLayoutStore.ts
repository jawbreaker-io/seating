import { useState, useMemo, useCallback } from 'react'
import type { Zone, Desk, DeskNameMap, UnavailableDeskMap } from './types'
import { zones as defaultZones, generateDesks } from './data'

const LAYOUT_STORAGE_KEY = 'seating-chart-layout'
const DESK_NAMES_STORAGE_KEY = 'seating-chart-desk-names'
const UNAVAILABLE_STORAGE_KEY = 'seating-chart-unavailable'

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

function loadDeskNames(): DeskNameMap {
  try {
    const stored = localStorage.getItem(DESK_NAMES_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as DeskNameMap
  } catch {
    // fall through to default
  }
  return {}
}

function saveDeskNames(names: DeskNameMap) {
  localStorage.setItem(DESK_NAMES_STORAGE_KEY, JSON.stringify(names))
}

function loadUnavailableDesks(): UnavailableDeskMap {
  try {
    const stored = localStorage.getItem(UNAVAILABLE_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as UnavailableDeskMap
  } catch {
    // fall through to default
  }
  return {}
}

function saveUnavailableDesks(unavailable: UnavailableDeskMap) {
  localStorage.setItem(UNAVAILABLE_STORAGE_KEY, JSON.stringify(unavailable))
}

export function useLayoutStore() {
  const [zones, setZones] = useState<Zone[]>(loadZones)
  const [deskNames, setDeskNames] = useState<DeskNameMap>(loadDeskNames)
  const [unavailableDesks, setUnavailableDesks] = useState<UnavailableDeskMap>(loadUnavailableDesks)

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
    // Clean up desk names and unavailable entries for removed zone
    setDeskNames((prev) => {
      const next: DeskNameMap = {}
      for (const [key, val] of Object.entries(prev)) {
        if (!key.startsWith(`${id}-`)) {
          next[key] = val
        }
      }
      saveDeskNames(next)
      return next
    })
    setUnavailableDesks((prev) => {
      const next: UnavailableDeskMap = {}
      for (const [key, val] of Object.entries(prev)) {
        if (!key.startsWith(`${id}-`)) {
          next[key] = val
        }
      }
      saveUnavailableDesks(next)
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    const fresh = defaultZones.map((z) => ({ ...z }))
    updateZones(fresh)
    setDeskNames({})
    saveDeskNames({})
    setUnavailableDesks({})
    saveUnavailableDesks({})
  }, [updateZones])

  const setDeskName = useCallback((deskId: string, name: string) => {
    setDeskNames((prev) => {
      const next = { ...prev }
      if (name.trim()) {
        next[deskId] = name.trim()
      } else {
        delete next[deskId]
      }
      saveDeskNames(next)
      return next
    })
  }, [])

  const setDeskUnavailable = useCallback((deskId: string, unavailable: boolean) => {
    setUnavailableDesks((prev) => {
      const next = { ...prev }
      if (unavailable) {
        next[deskId] = true
      } else {
        delete next[deskId]
      }
      saveUnavailableDesks(next)
      return next
    })
  }, [])

  return {
    zones,
    desks,
    deskNames,
    unavailableDesks,
    addZone,
    updateZone,
    removeZone,
    resetLayout,
    setDeskName,
    setDeskUnavailable,
  }
}
