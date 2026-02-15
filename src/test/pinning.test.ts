import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSeatingStore } from '../useSeatingStore'
import { desks } from '../data'

describe('useSeatingStore pinning', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with no pinned desks', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    expect(Object.keys(result.current.pinnedDesks)).toHaveLength(0)
  })

  it('togglePin pins an occupied desk', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    const deskId = 'z1-d0'
    expect(result.current.seating[deskId]).toBeTruthy()

    act(() => {
      result.current.togglePin(deskId)
    })

    expect(result.current.pinnedDesks[deskId]).toBe(true)
  })

  it('togglePin unpins a pinned desk', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    const deskId = 'z1-d0'

    act(() => {
      result.current.togglePin(deskId)
    })
    expect(result.current.pinnedDesks[deskId]).toBe(true)

    act(() => {
      result.current.togglePin(deskId)
    })
    expect(result.current.pinnedDesks[deskId]).toBeUndefined()
  })

  it('persists pinned desks to localStorage', () => {
    const { result } = renderHook(() => useSeatingStore(desks))

    act(() => {
      result.current.togglePin('z1-d0')
    })

    const stored = JSON.parse(localStorage.getItem('seating-chart-pinned')!)
    expect(stored['z1-d0']).toBe(true)
  })

  it('prevents unassign on pinned desk', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    const deskId = 'z1-d0'
    const empId = result.current.seating[deskId]

    act(() => {
      result.current.togglePin(deskId)
    })

    act(() => {
      result.current.unassignEmployee(deskId)
    })

    // Employee should still be there
    expect(result.current.seating[deskId]).toBe(empId)
  })

  it('prevents drop onto pinned desk', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    const pinnedDesk = 'z1-d0'
    const originalEmp = result.current.seating[pinnedDesk]

    act(() => {
      result.current.togglePin(pinnedDesk)
    })

    // Try to assign a new employee to the pinned desk
    const unassigned = result.current.unassignedEmployees[0]
    act(() => {
      result.current.assignEmployee(pinnedDesk, unassigned.id, null)
    })

    // Original employee should still be there
    expect(result.current.seating[pinnedDesk]).toBe(originalEmp)
  })

  it('prevents move from pinned desk', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    const pinnedDesk = 'z1-d0'
    const originalEmp = result.current.seating[pinnedDesk]!
    const emptyDesk = desks.find((d) => !result.current.seating[d.id])!

    act(() => {
      result.current.togglePin(pinnedDesk)
    })

    act(() => {
      result.current.assignEmployee(emptyDesk.id, originalEmp, pinnedDesk)
    })

    // Pinned employee should still be in place
    expect(result.current.seating[pinnedDesk]).toBe(originalEmp)
    expect(result.current.seating[emptyDesk.id]).toBeFalsy()
  })

  it('clearAll keeps pinned employees in place', () => {
    const { result } = renderHook(() => useSeatingStore(desks))
    const deskId = 'z1-d0'
    const empId = result.current.seating[deskId]

    act(() => {
      result.current.togglePin(deskId)
    })

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.seating[deskId]).toBe(empId)
    // Other desks should be cleared
    const otherAssigned = Object.entries(result.current.seating)
      .filter(([id, emp]) => id !== deskId && emp)
    expect(otherAssigned).toHaveLength(0)
  })

  it('loadSharedPins sets pinned desks', () => {
    const { result } = renderHook(() => useSeatingStore(desks))

    act(() => {
      result.current.loadSharedPins({ 'z1-d0': true, 'z2-d0': true })
    })

    expect(result.current.pinnedDesks['z1-d0']).toBe(true)
    expect(result.current.pinnedDesks['z2-d0']).toBe(true)
  })
})
