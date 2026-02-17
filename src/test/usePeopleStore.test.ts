import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePeopleStore } from '../usePeopleStore'
import { UNKNOWN_DEPARTMENT, employees as defaultEmployees } from '../data'

describe('usePeopleStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with default employees when no localStorage', () => {
    const { result } = renderHook(() => usePeopleStore())
    expect(result.current.employees).toHaveLength(defaultEmployees.length)
  })

  it('loads employees from localStorage when available', () => {
    const custom = [
      { id: 'e1', name: 'Test User', department: 'Engineering', avatar: 'TU' },
    ]
    localStorage.setItem('seating-chart-employees', JSON.stringify(custom))
    const { result } = renderHook(() => usePeopleStore())
    expect(result.current.employees).toHaveLength(1)
    expect(result.current.employees[0].name).toBe('Test User')
  })

  describe('Unknown department', () => {
    it('always includes the Unknown department on initialization', () => {
      const { result } = renderHook(() => usePeopleStore())
      expect(result.current.departments).toContain(UNKNOWN_DEPARTMENT)
    })

    it('includes Unknown department even when loading from localStorage without it', () => {
      const colors = { Engineering: '#3b82f6' }
      localStorage.setItem('seating-chart-dept-colors', JSON.stringify(colors))
      const { result } = renderHook(() => usePeopleStore())
      expect(result.current.departments).toContain(UNKNOWN_DEPARTMENT)
      expect(result.current.getDepartmentColor(UNKNOWN_DEPARTMENT)).toBe('#6b7280')
    })

    it('cannot be deleted', () => {
      const { result } = renderHook(() => usePeopleStore())

      // Add an employee to Unknown
      act(() => {
        result.current.addEmployee('Orphan User', UNKNOWN_DEPARTMENT)
      })
      const countBefore = result.current.employees.length

      // Attempt to delete Unknown department
      act(() => {
        result.current.removeDepartment(UNKNOWN_DEPARTMENT)
      })

      // Unknown should still exist and employee should not be affected
      expect(result.current.departments).toContain(UNKNOWN_DEPARTMENT)
      expect(result.current.employees).toHaveLength(countBefore)
    })

    it('cannot be renamed', () => {
      const { result } = renderHook(() => usePeopleStore())

      act(() => {
        result.current.renameDepartment(UNKNOWN_DEPARTMENT, 'Renamed')
      })

      expect(result.current.departments).toContain(UNKNOWN_DEPARTMENT)
      expect(result.current.departments).not.toContain('Renamed')
    })
  })

  describe('removeDepartment', () => {
    it('reassigns employees to Unknown instead of deleting them', () => {
      const { result } = renderHook(() => usePeopleStore())
      const engineeringEmployees = result.current.employees.filter(
        (e) => e.department === 'Engineering',
      )
      expect(engineeringEmployees.length).toBeGreaterThan(0)
      const totalBefore = result.current.employees.length

      act(() => {
        result.current.removeDepartment('Engineering')
      })

      // Total employee count should remain the same
      expect(result.current.employees).toHaveLength(totalBefore)

      // No employees should belong to Engineering anymore
      expect(
        result.current.employees.filter((e) => e.department === 'Engineering'),
      ).toHaveLength(0)

      // Former Engineering employees should now be in Unknown
      for (const emp of engineeringEmployees) {
        const updated = result.current.employees.find((e) => e.id === emp.id)
        expect(updated).toBeDefined()
        expect(updated!.department).toBe(UNKNOWN_DEPARTMENT)
      }
    })

    it('removes the department color entry', () => {
      const { result } = renderHook(() => usePeopleStore())
      expect(result.current.departmentColors).toHaveProperty('Engineering')

      act(() => {
        result.current.removeDepartment('Engineering')
      })

      expect(result.current.departmentColors).not.toHaveProperty('Engineering')
    })

    it('persists the changes to localStorage', () => {
      const { result } = renderHook(() => usePeopleStore())

      act(() => {
        result.current.removeDepartment('Design')
      })

      const storedEmployees = JSON.parse(
        localStorage.getItem('seating-chart-employees')!,
      )
      const storedColors = JSON.parse(
        localStorage.getItem('seating-chart-dept-colors')!,
      )

      // Employees should be reassigned, not deleted
      const designEmployees = defaultEmployees.filter(
        (e) => e.department === 'Design',
      )
      for (const emp of designEmployees) {
        const stored = storedEmployees.find(
          (e: { id: string }) => e.id === emp.id,
        )
        expect(stored).toBeDefined()
        expect(stored.department).toBe(UNKNOWN_DEPARTMENT)
      }

      // Color should be removed
      expect(storedColors).not.toHaveProperty('Design')
    })

    it('does not affect employees in other departments', () => {
      const { result } = renderHook(() => usePeopleStore())
      const salesBefore = result.current.employees.filter(
        (e) => e.department === 'Sales',
      )

      act(() => {
        result.current.removeDepartment('Engineering')
      })

      const salesAfter = result.current.employees.filter(
        (e) => e.department === 'Sales',
      )
      expect(salesAfter).toEqual(salesBefore)
    })
  })

  describe('addEmployee', () => {
    it('adds an employee', () => {
      const { result } = renderHook(() => usePeopleStore())
      const initialCount = result.current.employees.length

      act(() => {
        result.current.addEmployee('New Person', 'Engineering')
      })

      expect(result.current.employees).toHaveLength(initialCount + 1)
      const added = result.current.employees[result.current.employees.length - 1]
      expect(added.name).toBe('New Person')
      expect(added.department).toBe('Engineering')
    })
  })

  describe('removeEmployee', () => {
    it('removes an employee by id', () => {
      const { result } = renderHook(() => usePeopleStore())
      const initialCount = result.current.employees.length

      act(() => {
        result.current.removeEmployee('e1')
      })

      expect(result.current.employees).toHaveLength(initialCount - 1)
      expect(result.current.employees.find((e) => e.id === 'e1')).toBeUndefined()
    })
  })

  describe('resetPeople', () => {
    it('restores default employees and department colors', () => {
      const { result } = renderHook(() => usePeopleStore())

      act(() => {
        result.current.removeDepartment('Engineering')
      })

      act(() => {
        result.current.resetPeople()
      })

      expect(result.current.employees).toHaveLength(defaultEmployees.length)
      expect(result.current.departments).toContain(UNKNOWN_DEPARTMENT)
      expect(result.current.departmentColors).toHaveProperty('Engineering')
    })
  })
})
