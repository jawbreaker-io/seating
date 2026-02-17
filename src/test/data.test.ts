import { describe, it, expect } from 'vitest'
import {
  employees,
  zones,
  desks,
  defaultSeating,
  generateDesks,
  getDepartmentColor,
  UNKNOWN_DEPARTMENT,
} from '../data'

describe('data module', () => {
  describe('employees', () => {
    it('has 20 employees', () => {
      expect(employees).toHaveLength(20)
    })

    it('each employee has required fields', () => {
      for (const emp of employees) {
        expect(emp.id).toBeTruthy()
        expect(emp.name).toBeTruthy()
        expect(emp.department).toBeTruthy()
        expect(emp.avatar).toHaveLength(2)
      }
    })

    it('employee IDs are unique', () => {
      const ids = employees.map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('zones', () => {
    it('has 3 zones', () => {
      expect(zones).toHaveLength(3)
    })

    it('each zone has name and color', () => {
      for (const zone of zones) {
        expect(zone.name).toBeTruthy()
        expect(zone.color).toMatch(/^#/)
      }
    })
  })

  describe('generateDesks', () => {
    it('creates correct number of desks per zone', () => {
      const result = generateDesks(zones)
      const z1Desks = result.filter((d) => d.zone === 'z1')
      const z2Desks = result.filter((d) => d.zone === 'z2')
      const z3Desks = result.filter((d) => d.zone === 'z3')

      expect(z1Desks).toHaveLength(3 * 4) // 12
      expect(z2Desks).toHaveLength(2 * 3) // 6
      expect(z3Desks).toHaveLength(2 * 4) // 8
    })

    it('total desks is 26', () => {
      expect(desks).toHaveLength(26)
    })

    it('desk IDs are unique', () => {
      const ids = desks.map((d) => d.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('assigns correct row and col values', () => {
      const z1Desks = desks.filter((d) => d.zone === 'z1')
      // First desk in z1 should be row 0, col 0
      expect(z1Desks[0]).toEqual(
        expect.objectContaining({ row: 0, col: 0, zone: 'z1' }),
      )
      // Last desk in z1 (3 rows x 4 cols) should be row 2, col 3
      expect(z1Desks[z1Desks.length - 1]).toEqual(
        expect.objectContaining({ row: 2, col: 3, zone: 'z1' }),
      )
    })
  })

  describe('defaultSeating', () => {
    it('assigns known employees to desks', () => {
      const assignedIds = Object.values(defaultSeating).filter(Boolean)
      expect(assignedIds.length).toBeGreaterThan(0)

      for (const empId of assignedIds) {
        const employee = employees.find((e) => e.id === empId)
        expect(employee).toBeDefined()
      }
    })

    it('all desk IDs in seating map exist in desks', () => {
      for (const deskId of Object.keys(defaultSeating)) {
        const desk = desks.find((d) => d.id === deskId)
        expect(desk).toBeDefined()
      }
    })

    it('no employee is assigned to more than one desk', () => {
      const assigned = Object.values(defaultSeating).filter(Boolean)
      expect(new Set(assigned).size).toBe(assigned.length)
    })
  })

  describe('getDepartmentColor', () => {
    it('returns a color string for known departments', () => {
      expect(getDepartmentColor('Engineering')).toMatch(/^#/)
      expect(getDepartmentColor('Design')).toMatch(/^#/)
      expect(getDepartmentColor('Marketing')).toMatch(/^#/)
    })

    it('returns a color for the Other department', () => {
      expect(getDepartmentColor(UNKNOWN_DEPARTMENT)).toBe('#6b7280')
    })

    it('returns a fallback color for unrecognized departments', () => {
      expect(getDepartmentColor('NonExistent')).toBe('#6b7280')
    })
  })
})
