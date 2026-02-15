import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSeatingStore } from '../useSeatingStore'
import { defaultSeating, employees, desks } from '../data'

describe('useSeatingStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('initializes with default seating when no localStorage', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    expect(result.current.seating).toEqual(defaultSeating)
  })

  it('loads seating from localStorage when available', () => {
    const customSeating = { 'z1-d0': 'e3' }
    localStorage.setItem(
      'seating-chart-assignments',
      JSON.stringify(customSeating),
    )
    const { result } = renderHook(() => useSeatingStore(desks))
    expect(result.current.seating).toEqual(customSeating)
  })

  it('falls back to default seating on invalid localStorage', () => {
    localStorage.setItem('seating-chart-assignments', 'invalid-json{{{')
    const { result } = renderHook(() => useSeatingStore(desks))
    expect(result.current.seating).toEqual(defaultSeating)
  })

  describe('assignEmployee', () => {
    it('assigns an employee to an empty desk from sidebar', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const unassigned = result.current.unassignedEmployees
      const empId = unassigned[0].id
      const emptyDesk = desks.find(
        (d) => !result.current.seating[d.id],
      )!

      act(() => {
        result.current.assignEmployee(emptyDesk.id, empId, null)
      })

      expect(result.current.seating[emptyDesk.id]).toBe(empId)
    })

    it('moves an employee from one desk to another empty desk', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const sourceDeskId = 'z1-d0'
      const sourceEmp = result.current.seating[sourceDeskId]
      const emptyDesk = desks.find(
        (d) => !result.current.seating[d.id],
      )!

      act(() => {
        result.current.assignEmployee(emptyDesk.id, sourceEmp!, sourceDeskId)
      })

      expect(result.current.seating[emptyDesk.id]).toBe(sourceEmp)
      expect(result.current.seating[sourceDeskId]).toBeNull()
    })

    it('swaps two employees when dropping onto occupied desk', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const deskA = 'z1-d0'
      const deskB = 'z1-d1'
      const empA = result.current.seating[deskA]
      const empB = result.current.seating[deskB]

      act(() => {
        result.current.assignEmployee(deskB, empA!, deskA)
      })

      expect(result.current.seating[deskB]).toBe(empA)
      expect(result.current.seating[deskA]).toBe(empB)
    })

    it('persists to localStorage on assign', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const emptyDesk = desks.find(
        (d) => !result.current.seating[d.id],
      )!
      const unassigned = result.current.unassignedEmployees

      act(() => {
        result.current.assignEmployee(emptyDesk.id, unassigned[0].id, null)
      })

      const stored = JSON.parse(
        localStorage.getItem('seating-chart-assignments')!,
      )
      expect(stored[emptyDesk.id]).toBe(unassigned[0].id)
    })
  })

  describe('unassignEmployee', () => {
    it('removes an employee from a desk', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const deskId = 'z1-d0'
      expect(result.current.seating[deskId]).toBeTruthy()

      act(() => {
        result.current.unassignEmployee(deskId)
      })

      expect(result.current.seating[deskId]).toBeNull()
    })

    it('adds unassigned employee back to unassigned list', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const deskId = 'z1-d0'
      const empId = result.current.seating[deskId]!
      const beforeCount = result.current.unassignedEmployees.length

      act(() => {
        result.current.unassignEmployee(deskId)
      })

      expect(result.current.unassignedEmployees.length).toBe(beforeCount + 1)
      expect(
        result.current.unassignedEmployees.find((e) => e.id === empId),
      ).toBeDefined()
    })
  })

  describe('resetSeating', () => {
    it('restores default seating', () => {
      const { result } = renderHook(() => useSeatingStore(desks))

      // Modify seating first
      act(() => {
        result.current.unassignEmployee('z1-d0')
      })
      expect(result.current.seating['z1-d0']).toBeNull()

      // Reset
      act(() => {
        result.current.resetSeating()
      })
      expect(result.current.seating).toEqual(defaultSeating)
    })
  })

  describe('clearAll', () => {
    it('removes all assignments', () => {
      const { result } = renderHook(() => useSeatingStore(desks))

      act(() => {
        result.current.clearAll()
      })

      const assigned = Object.values(result.current.seating).filter(Boolean)
      expect(assigned).toHaveLength(0)
    })

    it('puts all employees in unassigned list', () => {
      const { result } = renderHook(() => useSeatingStore(desks))

      act(() => {
        result.current.clearAll()
      })

      expect(result.current.unassignedEmployees).toHaveLength(employees.length)
    })
  })

  describe('getEmployeeForDesk', () => {
    it('returns employee for occupied desk', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const emp = result.current.getEmployeeForDesk('z1-d0')
      expect(emp).not.toBeNull()
      expect(emp!.id).toBe(defaultSeating['z1-d0'])
    })

    it('returns null for empty desk', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const emptyDesk = desks.find(
        (d) => !result.current.seating[d.id],
      )!
      expect(result.current.getEmployeeForDesk(emptyDesk.id)).toBeNull()
    })
  })

  describe('getDeskForEmployee', () => {
    it('returns desk for seated employee', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const desk = result.current.getDeskForEmployee('e1')
      expect(desk).not.toBeNull()
      expect(desk!.id).toBe('z1-d0')
    })

    it('returns null for unassigned employee', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const unassigned = result.current.unassignedEmployees[0]
      expect(result.current.getDeskForEmployee(unassigned.id)).toBeNull()
    })
  })

  describe('unassignedEmployees', () => {
    it('returns employees not assigned to any desk', () => {
      const { result } = renderHook(() => useSeatingStore(desks))
      const assignedIds = new Set(
        Object.values(defaultSeating).filter(Boolean),
      )
      const expectedUnassigned = employees.filter(
        (e) => !assignedIds.has(e.id),
      )

      expect(result.current.unassignedEmployees).toHaveLength(
        expectedUnassigned.length,
      )
    })
  })
})
