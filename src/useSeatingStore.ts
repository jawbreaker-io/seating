import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { Desk, SeatingMap } from './types'
import { defaultSeating, employees } from './data'

const STORAGE_KEY = 'seating-chart-assignments'

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

export function useSeatingStore(desks: Desk[]) {
  const [seating, setSeating] = useState<SeatingMap>(loadSeating)

  // Clean up seating when desks change (e.g., zone removed or resized)
  const prevDeskIdsRef = useRef<string>('')
  useEffect(() => {
    const validDeskIds = new Set(desks.map((d) => d.id))
    const key = [...validDeskIds].sort().join(',')
    if (prevDeskIdsRef.current === key) return
    prevDeskIdsRef.current = key

    setSeating((prev) => {
      const next: SeatingMap = {}
      let changed = false
      for (const [deskId, empId] of Object.entries(prev)) {
        if (validDeskIds.has(deskId)) {
          next[deskId] = empId
        } else {
          changed = true
        }
      }
      if (changed) {
        saveSeating(next)
        return next
      }
      return prev
    })
  }, [desks])

  const updateSeating = useCallback((next: SeatingMap) => {
    setSeating(next)
    saveSeating(next)
  }, [])

  const assignEmployee = useCallback(
    (deskId: string, employeeId: string, sourceDeskId: string | null) => {
      setSeating((prev) => {
        const next = { ...prev }
        const currentOccupant = next[deskId]

        if (sourceDeskId && currentOccupant) {
          // Swap: move current occupant to source desk
          next[sourceDeskId] = currentOccupant
        } else if (sourceDeskId) {
          // Move from another desk to empty desk
          next[sourceDeskId] = null
        }

        next[deskId] = employeeId
        saveSeating(next)
        return next
      })
    },
    [],
  )

  const unassignEmployee = useCallback((deskId: string) => {
    setSeating((prev) => {
      const next = { ...prev }
      next[deskId] = null
      saveSeating(next)
      return next
    })
  }, [])

  const resetSeating = useCallback(() => {
    const fresh = { ...defaultSeating }
    updateSeating(fresh)
  }, [updateSeating])

  const clearAll = useCallback(() => {
    const empty: SeatingMap = {}
    for (const desk of desks) {
      empty[desk.id] = null
    }
    updateSeating(empty)
  }, [desks, updateSeating])

  const unassignedEmployees = useMemo(() => {
    const assignedIds = new Set(Object.values(seating).filter(Boolean))
    return employees.filter((e) => !assignedIds.has(e.id))
  }, [seating])

  const getEmployeeForDesk = useCallback(
    (deskId: string) => {
      const empId = seating[deskId]
      if (!empId) return null
      return employees.find((e) => e.id === empId) ?? null
    },
    [seating],
  )

  const getDeskForEmployee = useCallback(
    (employeeId: string) => {
      const entry = Object.entries(seating).find(
        ([, eid]) => eid === employeeId,
      )
      if (!entry) return null
      return desks.find((d) => d.id === entry[0]) ?? null
    },
    [seating, desks],
  )

  const loadShared = useCallback(
    (shared: SeatingMap) => {
      updateSeating(shared)
    },
    [updateSeating],
  )

  return {
    seating,
    assignEmployee,
    unassignEmployee,
    resetSeating,
    clearAll,
    loadShared,
    unassignedEmployees,
    getEmployeeForDesk,
    getDeskForEmployee,
  }
}
