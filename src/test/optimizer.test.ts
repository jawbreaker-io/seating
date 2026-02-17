import { describe, it, expect } from 'vitest'
import { clusterScore, countMoves, optimizeSeating } from '../optimizer'
import { employees, desks, defaultSeating, UNKNOWN_DEPARTMENT } from '../data'
import type { Desk, Employee, SeatingMap, PinnedDeskMap, UnavailableDeskMap } from '../types'

describe('clusterScore', () => {
  it('returns 0 for empty seating', () => {
    const empty: SeatingMap = {}
    for (const d of desks) {
      empty[d.id] = null
    }
    expect(clusterScore(empty, desks, employees)).toBe(0)
  })

  it('returns higher score when same-department employees are in the same zone', () => {
    // Place all Engineering employees in zone 1
    const clustered: SeatingMap = {}
    for (const d of desks) clustered[d.id] = null
    const engEmployees = employees.filter((e) => e.department === 'Engineering')
    const z1Desks = desks.filter((d) => d.zone === 'z1')
    engEmployees.forEach((emp, i) => {
      if (i < z1Desks.length) {
        clustered[z1Desks[i].id] = emp.id
      }
    })

    // Place them scattered across different zones
    const scattered: SeatingMap = {}
    for (const d of desks) scattered[d.id] = null
    scattered['z1-d0'] = engEmployees[0]?.id ?? null
    scattered['z2-d0'] = engEmployees[1]?.id ?? null
    scattered['z3-d0'] = engEmployees[2]?.id ?? null

    const clusteredScore = clusterScore(clustered, desks, employees)
    const scatteredScore = clusterScore(scattered, desks, employees)
    expect(clusteredScore).toBeGreaterThan(scatteredScore)
  })

  it('does not count Other department employees toward clustering score', () => {
    const unknownEmployees: Employee[] = [
      { id: 'u1', name: 'Other A', department: UNKNOWN_DEPARTMENT, avatar: 'UA' },
      { id: 'u2', name: 'Other B', department: UNKNOWN_DEPARTMENT, avatar: 'UB' },
      { id: 'u3', name: 'Other C', department: UNKNOWN_DEPARTMENT, avatar: 'UC' },
    ]
    const seating: SeatingMap = {}
    for (const d of desks) seating[d.id] = null

    // Place three Other employees adjacent in same zone
    seating['z1-d0'] = 'u1'
    seating['z1-d1'] = 'u2'
    seating['z1-d2'] = 'u3'

    expect(clusterScore(seating, desks, unknownEmployees)).toBe(0)
  })

  it('gives higher score for adjacent desks than distant same-zone desks', () => {
    const seating: SeatingMap = {}
    for (const d of desks) seating[d.id] = null

    // Two engineering employees adjacent (row 0, col 0 and col 1)
    seating['z1-d0'] = 'e1'
    seating['z1-d1'] = 'e2'
    const adjacentScore = clusterScore(seating, desks, employees)

    // Two engineering employees far apart in same zone (row 0 col 0 and row 2 col 3)
    const farSeating: SeatingMap = {}
    for (const d of desks) farSeating[d.id] = null
    farSeating['z1-d0'] = 'e1'
    farSeating['z1-d11'] = 'e2'
    const farScore = clusterScore(farSeating, desks, employees)

    expect(adjacentScore).toBeGreaterThan(farScore)
  })
})

describe('countMoves', () => {
  it('returns 0 when seating is unchanged', () => {
    expect(countMoves(defaultSeating, defaultSeating)).toBe(0)
  })

  it('counts a single swap as 2 moves', () => {
    const swapped = { ...defaultSeating }
    swapped['z1-d0'] = defaultSeating['z1-d1']!
    swapped['z1-d1'] = defaultSeating['z1-d0']!
    expect(countMoves(defaultSeating, swapped)).toBe(2)
  })

  it('counts a move to empty desk as 1 move', () => {
    const moved: SeatingMap = { ...defaultSeating }
    const emp = moved['z1-d0']!
    moved['z1-d0'] = null
    // Find an empty desk
    const emptyDesk = desks.find((d) => !defaultSeating[d.id])
    if (emptyDesk) {
      moved[emptyDesk.id] = emp
      expect(countMoves(defaultSeating, moved)).toBe(1)
    }
  })
})

describe('optimizeSeating', () => {
  const noPins: PinnedDeskMap = {}
  const noUnavailable: UnavailableDeskMap = {}

  describe('full mode', () => {
    it('produces a valid seating map with all currently-assigned employees', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full', employees)
      const assignedBefore = new Set(
        Object.values(defaultSeating).filter(Boolean),
      )
      const assignedAfter = new Set(
        Object.values(result.seating).filter(Boolean),
      )
      expect(assignedAfter).toEqual(assignedBefore)
    })

    it('improves or maintains cluster score', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full', employees)
      expect(result.clusterScore).toBeGreaterThanOrEqual(result.previousScore)
    })

    it('respects pinned desks', () => {
      const pins: PinnedDeskMap = { 'z1-d0': true }
      const result = optimizeSeating(defaultSeating, desks, pins, noUnavailable, 'full', employees)
      expect(result.seating['z1-d0']).toBe(defaultSeating['z1-d0'])
    })

    it('respects unavailable desks', () => {
      const unavailable: UnavailableDeskMap = { 'z1-d5': true }
      const result = optimizeSeating(defaultSeating, desks, noPins, unavailable, 'full', employees)
      expect(result.seating['z1-d5']).toBeNull()
    })

    it('reports correct move count', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full', employees)
      expect(result.moves).toBe(countMoves(defaultSeating, result.seating))
    })
  })

  it('does not group Other department employees together in full mode', () => {
    // Create employees: some Engineering + some Other
    const testEmployees: Employee[] = [
      { id: 't1', name: 'Eng A', department: 'Engineering', avatar: 'EA' },
      { id: 't2', name: 'Eng B', department: 'Engineering', avatar: 'EB' },
      { id: 't3', name: 'Unk A', department: UNKNOWN_DEPARTMENT, avatar: 'UA' },
      { id: 't4', name: 'Unk B', department: UNKNOWN_DEPARTMENT, avatar: 'UB' },
    ]

    const seating: SeatingMap = {}
    for (const d of desks) seating[d.id] = null
    // Scatter them across zones
    seating['z1-d0'] = 't3' // Other in z1
    seating['z2-d0'] = 't1' // Engineering in z2
    seating['z3-d0'] = 't4' // Other in z3
    seating['z3-d1'] = 't2' // Engineering in z3

    const result = optimizeSeating(seating, desks, noPins, noUnavailable, 'full', testEmployees)

    // Engineering employees should end up clustered together
    const assignedAfter = new Set(Object.values(result.seating).filter(Boolean))
    expect(assignedAfter).toEqual(new Set(['t1', 't2', 't3', 't4']))

    // Other employees should not generate clustering score
    const unknownOnly: Employee[] = testEmployees.filter(e => e.department === UNKNOWN_DEPARTMENT)
    const unknownSeating: SeatingMap = {}
    for (const [deskId, empId] of Object.entries(result.seating)) {
      if (empId && unknownOnly.some(e => e.id === empId)) {
        unknownSeating[deskId] = empId
      } else {
        unknownSeating[deskId] = null
      }
    }
    // Other employees by themselves contribute 0 to cluster score
    expect(clusterScore(unknownSeating, desks, unknownOnly)).toBe(0)
  })

  it('full mode scores at least as high as minimize-moves mode', () => {
      const fullResult = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full', employees)
      const minResult = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'minimize-moves', employees)
      expect(fullResult.clusterScore).toBeGreaterThanOrEqual(minResult.clusterScore)
    })

    describe('minimize-moves mode', () => {
    it('produces a valid seating map with all currently-assigned employees', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'minimize-moves', employees)
      const assignedBefore = new Set(
        Object.values(defaultSeating).filter(Boolean),
      )
      const assignedAfter = new Set(
        Object.values(result.seating).filter(Boolean),
      )
      expect(assignedAfter).toEqual(assignedBefore)
    })

    it('improves or maintains cluster score', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'minimize-moves', employees)
      expect(result.clusterScore).toBeGreaterThanOrEqual(result.previousScore)
    })

    it('uses fewer or equal moves compared to full optimization', () => {
      const fullResult = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full', employees)
      const minResult = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'minimize-moves', employees)
      expect(minResult.moves).toBeLessThanOrEqual(fullResult.moves)
    })

    it('respects pinned desks', () => {
      const pins: PinnedDeskMap = { 'z1-d0': true, 'z3-d0': true }
      const result = optimizeSeating(defaultSeating, desks, pins, noUnavailable, 'minimize-moves', employees)
      expect(result.seating['z1-d0']).toBe(defaultSeating['z1-d0'])
      expect(result.seating['z3-d0']).toBe(defaultSeating['z3-d0'])
    })

    it('never exceeds full optimization move count (cyclic arrangement)', () => {
      // Cyclic department arrangement where greedy swaps need 2 swaps (4 moves)
      // but direct reassignment only needs 3 moves (a 3-way rotation).
      const testDesks: Desk[] = [
        { id: 'tz1-d0', row: 0, col: 0, zone: 'tz1' },
        { id: 'tz1-d1', row: 0, col: 1, zone: 'tz1' },
        { id: 'tz2-d0', row: 0, col: 0, zone: 'tz2' },
        { id: 'tz2-d1', row: 0, col: 1, zone: 'tz2' },
        { id: 'tz3-d0', row: 0, col: 0, zone: 'tz3' },
        { id: 'tz3-d1', row: 0, col: 1, zone: 'tz3' },
      ]

      const testEmployees: Employee[] = [
        { id: 'ta1', name: 'A1', department: 'Alpha', avatar: 'A1' },
        { id: 'ta2', name: 'A2', department: 'Alpha', avatar: 'A2' },
        { id: 'tb1', name: 'B1', department: 'Beta', avatar: 'B1' },
        { id: 'tb2', name: 'B2', department: 'Beta', avatar: 'B2' },
        { id: 'tc1', name: 'C1', department: 'Gamma', avatar: 'C1' },
        { id: 'tc2', name: 'C2', department: 'Gamma', avatar: 'C2' },
      ]

      // Each zone has one employee from two different departments (cyclic)
      const cyclicSeating: SeatingMap = {
        'tz1-d0': 'ta1', 'tz1-d1': 'tb1',
        'tz2-d0': 'tb2', 'tz2-d1': 'tc1',
        'tz3-d0': 'tc2', 'tz3-d1': 'ta2',
      }

      const fullResult = optimizeSeating(cyclicSeating, testDesks, {}, {}, 'full', testEmployees)
      const minResult = optimizeSeating(cyclicSeating, testDesks, {}, {}, 'minimize-moves', testEmployees)

      expect(minResult.moves).toBeLessThanOrEqual(fullResult.moves)
    })
  })
})
