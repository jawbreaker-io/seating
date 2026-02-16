import { useState, useCallback, useMemo } from 'react'
import type { Employee } from './types'
import { employees as defaultEmployees, UNKNOWN_DEPARTMENT } from './data'

const EMPLOYEES_STORAGE_KEY = 'seating-chart-employees'
const DEPT_COLORS_STORAGE_KEY = 'seating-chart-dept-colors'

const DEFAULT_DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: '#3b82f6',
  Design: '#a855f7',
  Marketing: '#f97316',
  Sales: '#10b981',
  HR: '#ec4899',
  Finance: '#eab308',
  Product: '#06b6d4',
  Operations: '#6366f1',
  [UNKNOWN_DEPARTMENT]: '#6b7280',
}

function makeAvatar(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.trim().substring(0, 2).toUpperCase()
}

function nextEmployeeId(employees: Employee[]): string {
  const nums = employees
    .map((e) => parseInt(e.id.replace('e', ''), 10))
    .filter((n) => !isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `e${max + 1}`
}

function loadEmployees(): Employee[] {
  try {
    const stored = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Employee[]
  } catch {
    // fall through to default
  }
  return defaultEmployees.map((e) => ({ ...e }))
}

function saveEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees))
}

function loadDepartmentColors(): Record<string, string> {
  try {
    const stored = localStorage.getItem(DEPT_COLORS_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Record<string, string>
  } catch {
    // fall through to default
  }
  return { ...DEFAULT_DEPARTMENT_COLORS }
}

function saveDepartmentColors(colors: Record<string, string>) {
  localStorage.setItem(DEPT_COLORS_STORAGE_KEY, JSON.stringify(colors))
}

export function usePeopleStore() {
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees)
  const [departmentColors, setDepartmentColors] = useState<Record<string, string>>(loadDepartmentColors)

  const departments = useMemo(() => {
    const allDepts = new Set<string>()
    // Include departments from employees
    for (const e of employees) {
      allDepts.add(e.department)
    }
    // Include departments from the color map
    for (const d of Object.keys(departmentColors)) {
      allDepts.add(d)
    }
    return [...allDepts].sort()
  }, [employees, departmentColors])

  const getDepartmentColor = useCallback(
    (department: string): string => {
      return departmentColors[department] ?? '#6b7280'
    },
    [departmentColors],
  )

  const addEmployee = useCallback(
    (name: string, department: string) => {
      setEmployees((prev) => {
        const next = [
          ...prev,
          {
            id: nextEmployeeId(prev),
            name: name.trim(),
            department,
            avatar: makeAvatar(name),
          },
        ]
        saveEmployees(next)
        return next
      })
    },
    [],
  )

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Omit<Employee, 'id'>>) => {
      setEmployees((prev) => {
        const next = prev.map((e) => {
          if (e.id !== id) return e
          const updated = { ...e, ...updates }
          // Recalculate avatar if name changed
          if (updates.name) {
            updated.avatar = makeAvatar(updates.name)
          }
          return updated
        })
        saveEmployees(next)
        return next
      })
    },
    [],
  )

  const removeEmployee = useCallback((id: string) => {
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id)
      saveEmployees(next)
      return next
    })
  }, [])

  const setDepartmentColor = useCallback(
    (department: string, color: string) => {
      setDepartmentColors((prev) => {
        const next = { ...prev, [department]: color }
        saveDepartmentColors(next)
        return next
      })
    },
    [],
  )

  const addDepartment = useCallback(
    (name: string, color: string) => {
      setDepartmentColors((prev) => {
        const next = { ...prev, [name]: color }
        saveDepartmentColors(next)
        return next
      })
    },
    [],
  )

  const renameDepartment = useCallback(
    (oldName: string, newName: string) => {
      if (oldName === newName) return
      // Update color map
      setDepartmentColors((prev) => {
        const next = { ...prev }
        if (next[oldName]) {
          next[newName] = next[oldName]
          delete next[oldName]
        }
        saveDepartmentColors(next)
        return next
      })
      // Update all employees in that department
      setEmployees((prev) => {
        const next = prev.map((e) =>
          e.department === oldName ? { ...e, department: newName } : e,
        )
        saveEmployees(next)
        return next
      })
    },
    [],
  )

  const removeDepartment = useCallback((name: string) => {
    setDepartmentColors((prev) => {
      const next = { ...prev }
      delete next[name]
      saveDepartmentColors(next)
      return next
    })
    // Remove employees in that department
    setEmployees((prev) => {
      const next = prev.filter((e) => e.department !== name)
      saveEmployees(next)
      return next
    })
  }, [])

  const resetPeople = useCallback(() => {
    const freshEmployees = defaultEmployees.map((e) => ({ ...e }))
    const freshColors = { ...DEFAULT_DEPARTMENT_COLORS }
    setEmployees(freshEmployees)
    saveEmployees(freshEmployees)
    setDepartmentColors(freshColors)
    saveDepartmentColors(freshColors)
  }, [])

  const loadSharedPeople = useCallback(
    (sharedEmployees: Employee[], sharedColors: Record<string, string>) => {
      setEmployees(sharedEmployees)
      saveEmployees(sharedEmployees)
      setDepartmentColors(sharedColors)
      saveDepartmentColors(sharedColors)
    },
    [],
  )

  return {
    employees,
    departmentColors,
    departments,
    getDepartmentColor,
    addEmployee,
    updateEmployee,
    removeEmployee,
    setDepartmentColor,
    addDepartment,
    renameDepartment,
    removeDepartment,
    resetPeople,
    loadSharedPeople,
  }
}
