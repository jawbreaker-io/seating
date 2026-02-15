import { describe, it, expect } from 'vitest'
import { clusterScore, countMoves, optimizeSeating } from '../optimizer'
import { employees, desks, defaultSeating } from '../data'
import type { SeatingMap, PinnedDeskMap, UnavailableDeskMap } from '../types'

describe('clusterScore', () => {
  it('returns 0 for empty seating', () => {
    const empty: SeatingMap = {}
    for (const d of desks) {
      empty[d.id] = null
    }
    expect(clusterScore(empty, desks)).toBe(0)
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

    const clusteredScore = clusterScore(clustered, desks)
    const scatteredScore = clusterScore(scattered, desks)
    expect(clusteredScore).toBeGreaterThan(scatteredScore)
  })

  it('gives higher score for adjacent desks than distant same-zone desks', () => {
    const seating: SeatingMap = {}
    for (const d of desks) seating[d.id] = null

    // Two engineering employees adjacent (row 0, col 0 and col 1)
    seating['z1-d0'] = 'e1'
    seating['z1-d1'] = 'e2'
    const adjacentScore = clusterScore(seating, desks)

    // Two engineering employees far apart in same zone (row 0 col 0 and row 2 col 3)
    const farSeating: SeatingMap = {}
    for (const d of desks) farSeating[d.id] = null
    farSeating['z1-d0'] = 'e1'
    farSeating['z1-d11'] = 'e2'
    const farScore = clusterScore(farSeating, desks)

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
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full')
      const assignedBefore = new Set(
        Object.values(defaultSeating).filter(Boolean),
      )
      const assignedAfter = new Set(
        Object.values(result.seating).filter(Boolean),
      )
      expect(assignedAfter).toEqual(assignedBefore)
    })

    it('improves or maintains cluster score', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full')
      expect(result.clusterScore).toBeGreaterThanOrEqual(result.previousScore)
    })

    it('respects pinned desks', () => {
      const pins: PinnedDeskMap = { 'z1-d0': true }
      const result = optimizeSeating(defaultSeating, desks, pins, noUnavailable, 'full')
      expect(result.seating['z1-d0']).toBe(defaultSeating['z1-d0'])
    })

    it('respects unavailable desks', () => {
      const unavailable: UnavailableDeskMap = { 'z1-d5': true }
      const result = optimizeSeating(defaultSeating, desks, noPins, unavailable, 'full')
      expect(result.seating['z1-d5']).toBeNull()
    })

    it('reports correct move count', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full')
      expect(result.moves).toBe(countMoves(defaultSeating, result.seating))
    })
  })

  describe('minimize-moves mode', () => {
    it('produces a valid seating map with all currently-assigned employees', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'minimize-moves')
      const assignedBefore = new Set(
        Object.values(defaultSeating).filter(Boolean),
      )
      const assignedAfter = new Set(
        Object.values(result.seating).filter(Boolean),
      )
      expect(assignedAfter).toEqual(assignedBefore)
    })

    it('improves or maintains cluster score', () => {
      const result = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'minimize-moves')
      expect(result.clusterScore).toBeGreaterThanOrEqual(result.previousScore)
    })

    it('uses fewer or equal moves compared to full optimization', () => {
      const fullResult = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'full')
      const minResult = optimizeSeating(defaultSeating, desks, noPins, noUnavailable, 'minimize-moves')
      expect(minResult.moves).toBeLessThanOrEqual(fullResult.moves)
    })

    it('respects pinned desks', () => {
      const pins: PinnedDeskMap = { 'z1-d0': true, 'z3-d0': true }
      const result = optimizeSeating(defaultSeating, desks, pins, noUnavailable, 'minimize-moves')
      expect(result.seating['z1-d0']).toBe(defaultSeating['z1-d0'])
      expect(result.seating['z3-d0']).toBe(defaultSeating['z3-d0'])
    })
  })
})
