import { useState, useCallback, useMemo } from 'react'
import type { SeatingMap } from './types'
import { defaultSeating, desks, employees } from './data'

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

export function useSeatingStore() {
  const [seating, setSeating] = useState<SeatingMap>(loadSeating)

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
  }, [updateSeating])

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
    [seating],
  )

  return {
    seating,
    assignEmployee,
    unassignEmployee,
    resetSeating,
    clearAll,
    unassignedEmployees,
    getEmployeeForDesk,
    getDeskForEmployee,
  }
}
