import { useState, useCallback, useMemo } from 'react'
import type { Desk, Employee, SeatingMap, PinnedDeskMap } from './types'
import { defaultSeating } from './data'

const STORAGE_KEY = 'seating-chart-assignments'
const PINNED_STORAGE_KEY = 'seating-chart-pinned'

function loadSeating(): SeatingMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as SeatingMap
  } catch {
    // fall through to default
  }
  return { ...defaultSeating }
}

function saveSeating(seating: SeatingMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seating))
}

function loadPinnedDesks(): PinnedDeskMap {
  try {
    const stored = localStorage.getItem(PINNED_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as PinnedDeskMap
  } catch {
    // fall through to default
  }
  return {}
}

function savePinnedDesks(pinned: PinnedDeskMap) {
  localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned))
}

export function useSeatingStore(desks: Desk[], employees: Employee[]) {
  const [seating, setSeating] = useState<SeatingMap>(loadSeating)
  const [pinnedDesks, setPinnedDesks] = useState<PinnedDeskMap>(loadPinnedDesks)

  const validDeskIds = useMemo(() => new Set(desks.map((d) => d.id)), [desks])

  const updateSeating = useCallback((next: SeatingMap) => {
    setSeating(next)
    saveSeating(next)
  }, [])

  const assignEmployee = useCallback(
    (deskId: string, employeeId: string, sourceDeskId: string | null) => {
      setSeating((prev) => {
        // Block drops onto pinned desks or moves from pinned desks
        if (pinnedDesks[deskId] || (sourceDeskId && pinnedDesks[sourceDeskId])) {
          return prev
        }
        const next = { ...prev }
        const currentOccupant = next[deskId]

        if (sourceDeskId && currentOccupant) {
          next[sourceDeskId] = currentOccupant
        } else if (sourceDeskId) {
          next[sourceDeskId] = null
        }

        next[deskId] = employeeId
        saveSeating(next)
        return next
      })
    },
    [pinnedDesks],
  )

  const unassignEmployee = useCallback(
    (deskId: string) => {
      if (pinnedDesks[deskId]) return
      setSeating((prev) => {
        const next = { ...prev }
        next[deskId] = null
        saveSeating(next)
        return next
      })
    },
    [pinnedDesks],
  )

  const togglePin = useCallback(
    (deskId: string) => {
      setPinnedDesks((prev) => {
        const next = { ...prev }
        if (next[deskId]) {
          delete next[deskId]
        } else {
          next[deskId] = true
        }
        savePinnedDesks(next)
        return next
      })
    },
    [],
  )

  const resetSeating = useCallback(() => {
    const fresh = { ...defaultSeating }
    updateSeating(fresh)
  }, [updateSeating])

  const clearAll = useCallback(() => {
    const empty: SeatingMap = {}
    for (const desk of desks) {
      if (pinnedDesks[desk.id] && seating[desk.id]) {
        empty[desk.id] = seating[desk.id]
      } else {
        empty[desk.id] = null
      }
    }
    updateSeating(empty)
  }, [desks, pinnedDesks, seating, updateSeating])

  // Only count employees assigned to currently-valid desks
  const unassignedEmployees = useMemo(() => {
    const assignedIds = new Set(
      Object.entries(seating)
        .filter(([deskId, empId]) => empId && validDeskIds.has(deskId))
        .map(([, empId]) => empId),
    )
    return employees.filter((e) => !assignedIds.has(e.id))
  }, [seating, validDeskIds, employees])

  const getEmployeeForDesk = useCallback(
    (deskId: string) => {
      const empId = seating[deskId]
      if (!empId) return null
      return employees.find((e) => e.id === empId) ?? null
    },
    [seating, employees],
  )

  const getDeskForEmployee = useCallback(
    (employeeId: string) => {
      const entry = Object.entries(seating).find(
        ([deskId, eid]) => eid === employeeId && validDeskIds.has(deskId),
      )
      if (!entry) return null
      return desks.find((d) => d.id === entry[0]) ?? null
    },
    [seating, desks, validDeskIds],
  )

  const loadShared = useCallback(
    (shared: SeatingMap) => {
      updateSeating(shared)
    },
    [updateSeating],
  )

  const loadSharedPins = useCallback(
    (shared: PinnedDeskMap) => {
      setPinnedDesks(shared)
      savePinnedDesks(shared)
    },
    [],
  )

  return {
    seating,
    pinnedDesks,
    assignEmployee,
    unassignEmployee,
    togglePin,
    resetSeating,
    clearAll,
    loadShared,
    loadSharedPins,
    unassignedEmployees,
    getEmployeeForDesk,
    getDeskForEmployee,
  }
}
