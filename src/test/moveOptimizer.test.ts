import { describe, it, expect, beforeEach } from 'vitest'
import { computeMovePlan } from '../moveOptimizer'
import type { MovePlan } from '../moveOptimizer'
import type { Employee, SeatingMap } from '../types'
import {
  encodeMovePlanPayload,
  decodeMovePlanPayload,
  buildMovePlanUrl,
  getMovePlanData,
} from '../shareUtils'
import type { MovePlanPayload } from '../shareUtils'
import { zones, employees as defaultEmployees, defaultSeating } from '../data'

const emp = (id: string, name: string, dept = 'Engineering'): Employee => ({
  id,
  name,
  department: dept,
  avatar: name.substring(0, 2).toUpperCase(),
})

const employees: Employee[] = [
  emp('e1', 'Alice', 'Engineering'),
  emp('e2', 'Bob', 'Engineering'),
  emp('e3', 'Carol', 'Design'),
  emp('e4', 'David', 'Marketing'),
  emp('e5', 'Eva', 'Sales'),
  emp('e6', 'Frank', 'Engineering'),
]

// ─── Core Algorithm ────────────────────────────────────────────────────────

describe('computeMovePlan', () => {
  it('returns no steps when layouts are identical', () => {
    const seating: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': null }
    const plan = computeMovePlan(seating, seating, employees)
    expect(plan.steps).toHaveLength(0)
    expect(plan.summary.unchanged).toBe(2)
    expect(plan.summary.totalSteps).toBe(0)
  })

  it('handles a simple move to an empty desk', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': null }
    const target: SeatingMap = { 'd1': null, 'd2': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].employeeId).toBe('e1')
    expect(plan.steps[0].fromDeskId).toBe('d1')
    expect(plan.steps[0].toDeskId).toBe('d2')
    expect(plan.summary.peopleMoving).toBe(1)
    expect(plan.summary.cyclesDetected).toBe(0)
  })

  it('handles a direct swap (2-cycle)', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    // A 2-cycle is 2 simultaneous swap steps
    expect(plan.steps).toHaveLength(2)
    expect(plan.summary.cyclesDetected).toBe(1)
    expect(plan.summary.peopleMoving).toBe(2)

    // Both steps should have swap partner names
    expect(plan.steps[0].swapPartnerNames).toBeDefined()
    expect(plan.steps[1].swapPartnerNames).toBeDefined()

    // Verify the result is achievable: simulate the moves
    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
    expect(sim['d2']).toBe('e1')
  })

  it('handles a 3-cycle', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': 'e3', 'd3': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    // 3-cycle: 3 simultaneous swap steps
    expect(plan.steps).toHaveLength(3)
    expect(plan.summary.cyclesDetected).toBe(1)

    // Each step should list 2 swap partners
    for (const step of plan.steps) {
      expect(step.swapPartnerNames).toHaveLength(2)
    }

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
    expect(sim['d2']).toBe('e3')
    expect(sim['d3']).toBe('e1')
  })

  it('handles a 4-cycle', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': 'e3', 'd3': 'e4', 'd4': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    // 4-cycle: 4 simultaneous swap steps
    expect(plan.steps).toHaveLength(4)
    expect(plan.summary.cyclesDetected).toBe(1)

    // Each step should list 3 swap partners
    for (const step of plan.steps) {
      expect(step.swapPartnerNames).toHaveLength(3)
    }

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
    expect(sim['d2']).toBe('e3')
    expect(sim['d3']).toBe('e4')
    expect(sim['d4']).toBe('e1')
  })

  it('handles removals (people leaving desks entirely)', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2' }
    const target: SeatingMap = { 'd1': null, 'd2': 'e2' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].employeeId).toBe('e1')
    expect(plan.steps[0].fromDeskId).toBe('d1')
    expect(plan.steps[0].toDeskId).toBeNull()
    expect(plan.steps[0].toDeskLabel).toBe('Unassigned')
    expect(plan.summary.removals).toBe(1)
  })

  it('handles multiple removals', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const target: SeatingMap = { 'd1': null, 'd2': null, 'd3': 'e3' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.removals).toBe(2)
    expect(plan.summary.unchanged).toBe(1)
    expect(plan.steps).toHaveLength(2)

    const removedIds = plan.steps.map((s) => s.employeeId).sort()
    expect(removedIds).toEqual(['e1', 'e2'])
  })

  it('handles new assignments (people arriving)', () => {
    const original: SeatingMap = { 'd1': null, 'd2': 'e2' }
    const target: SeatingMap = { 'd1': 'e1', 'd2': 'e2' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].employeeId).toBe('e1')
    expect(plan.steps[0].fromDeskId).toBeNull()
    expect(plan.steps[0].fromDeskLabel).toBe('Unassigned')
    expect(plan.steps[0].toDeskId).toBe('d1')
    expect(plan.summary.newAssignments).toBe(1)
  })

  it('handles multiple new assignments', () => {
    const original: SeatingMap = { 'd1': null, 'd2': null, 'd3': null }
    const target: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.newAssignments).toBe(3)
    expect(plan.steps).toHaveLength(3)
  })

  it('prioritizes removals before moves (frees desks first)', () => {
    // e1 is leaving d1, e2 needs to move from d2 to d1
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': null }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(2)
    // First step should be removal (frees d1)
    expect(plan.steps[0].employeeId).toBe('e1')
    expect(plan.steps[0].toDeskId).toBeNull()
    // Second step should be the move (d2 -> d1)
    expect(plan.steps[1].employeeId).toBe('e2')
    expect(plan.steps[1].fromDeskId).toBe('d2')
    expect(plan.steps[1].toDeskId).toBe('d1')
  })

  it('handles chain moves (no cycles) efficiently', () => {
    // Chain: e1 moves to d3 (empty), then e2 can move to d1
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': null }
    const target: SeatingMap = { 'd1': 'e2', 'd2': null, 'd3': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    // Should be only 2 moves, no cycles
    expect(plan.steps).toHaveLength(2)
    expect(plan.summary.cyclesDetected).toBe(0)

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
    expect(sim['d2']).toBeNull()
    expect(sim['d3']).toBe('e1')
  })

  it('handles mixed removals, moves, cycles, and additions', () => {
    const original: SeatingMap = {
      'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4', 'd5': null,
    }
    const target: SeatingMap = {
      'd1': 'e2', 'd2': 'e1', 'd3': null, 'd4': 'e5', 'd5': 'e6',
    }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.removals).toBe(2)
    expect(plan.summary.cyclesDetected).toBe(1)
    expect(plan.summary.newAssignments).toBe(2)

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
    expect(sim['d2']).toBe('e1')
    expect(sim['d3']).toBeNull()
    expect(sim['d4']).toBe('e5')
    expect(sim['d5']).toBe('e6')
  })

  it('handles two independent cycles', () => {
    const original: SeatingMap = {
      'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4',
    }
    const target: SeatingMap = {
      'd1': 'e2', 'd2': 'e1', 'd3': 'e4', 'd4': 'e3',
    }
    const plan = computeMovePlan(original, target, employees)

    // Two 2-cycles = 4 swap steps total
    expect(plan.steps).toHaveLength(4)
    expect(plan.summary.cyclesDetected).toBe(2)

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
    expect(sim['d2']).toBe('e1')
    expect(sim['d3']).toBe('e4')
    expect(sim['d4']).toBe('e3')
  })

  it('removal frees desk needed by another move, avoiding a false cycle', () => {
    // e3 leaves d3, e1 needs d3, e2 needs d1
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': null, 'd3': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.removals).toBe(1)
    expect(plan.summary.cyclesDetected).toBe(0)
    expect(plan.summary.peopleMoving).toBe(2)

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
    expect(sim['d2']).toBeNull()
    expect(sim['d3']).toBe('e1')
  })

  it('uses desk names in labels when provided', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': null }
    const target: SeatingMap = { 'd1': null, 'd2': 'e1' }
    const names = { 'd1': 'Window Seat', 'd2': 'Corner Desk' }
    const plan = computeMovePlan(original, target, employees, names)

    expect(plan.steps[0].fromDeskLabel).toBe('Window Seat')
    expect(plan.steps[0].toDeskLabel).toBe('Corner Desk')
  })

  it('formats desk IDs as labels when no desk names provided', () => {
    const original: SeatingMap = { 'z1-d0': 'e1', 'z1-d1': null }
    const target: SeatingMap = { 'z1-d0': null, 'z1-d1': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps[0].fromDeskLabel).toBe('Z1-D0')
    expect(plan.steps[0].toDeskLabel).toBe('Z1-D1')
  })

  it('step numbers are sequential starting from 1', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const target: SeatingMap = { 'd1': 'e3', 'd2': 'e1', 'd3': 'e2' }
    const plan = computeMovePlan(original, target, employees)

    for (let i = 0; i < plan.steps.length; i++) {
      expect(plan.steps[i].step).toBe(i + 1)
    }
  })

  it('handles employees unknown to the employee list gracefully', () => {
    const original: SeatingMap = { 'd1': 'unknown1', 'd2': null }
    const target: SeatingMap = { 'd1': null, 'd2': 'unknown1' }
    const plan = computeMovePlan(original, target, [])

    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].employeeName).toBe('unknown1')
  })

  it('all moves in the plan result in the target seating (full shuffle)', () => {
    const original: SeatingMap = {
      'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4', 'd5': 'e5', 'd6': 'e6',
    }
    const target: SeatingMap = {
      'd1': 'e6', 'd2': 'e5', 'd3': 'e4', 'd4': 'e3', 'd5': 'e2', 'd6': 'e1',
    }
    const plan = computeMovePlan(original, target, employees)
    const sim = simulateMoves(original, plan)

    for (const [deskId, empId] of Object.entries(target)) {
      expect(sim[deskId]).toBe(empId)
    }
  })

  it('handles both maps being completely empty', () => {
    const original: SeatingMap = { 'd1': null, 'd2': null }
    const target: SeatingMap = { 'd1': null, 'd2': null }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(0)
    expect(plan.summary.totalSteps).toBe(0)
    expect(plan.summary.unchanged).toBe(0)
  })

  it('handles going from all empty to all filled', () => {
    const original: SeatingMap = { 'd1': null, 'd2': null, 'd3': null }
    const target: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.newAssignments).toBe(3)
    expect(plan.summary.removals).toBe(0)
    expect(plan.summary.peopleMoving).toBe(0)
    expect(plan.steps).toHaveLength(3)
  })

  it('handles going from all filled to all empty', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const target: SeatingMap = { 'd1': null, 'd2': null, 'd3': null }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.removals).toBe(3)
    expect(plan.summary.newAssignments).toBe(0)
    expect(plan.summary.peopleMoving).toBe(0)
    expect(plan.steps).toHaveLength(3)
  })

  it('handles desks that only exist in the target layout', () => {
    const original: SeatingMap = { 'd1': 'e1' }
    const target: SeatingMap = { 'd1': null, 'd2': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].toDeskId).toBe('d2')

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBeNull()
    expect(sim['d2']).toBe('e1')
  })

  it('handles replacement: person leaves desk and different person takes it', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': null }
    const target: SeatingMap = { 'd1': 'e2', 'd2': null }
    const plan = computeMovePlan(original, target, employees)

    // e1 is removed, e2 is newly assigned
    expect(plan.summary.removals).toBe(1)
    expect(plan.summary.newAssignments).toBe(1)

    const sim = simulateMoves(original, plan)
    expect(sim['d1']).toBe('e2')
  })

  it('summary counts are consistent with steps', () => {
    const original: SeatingMap = {
      'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4', 'd5': null, 'd6': null,
    }
    const target: SeatingMap = {
      'd1': 'e2', 'd2': 'e1', 'd3': null, 'd4': 'e5', 'd5': 'e6', 'd6': null,
    }
    const plan = computeMovePlan(original, target, employees)

    // Count step types from the actual steps
    const removeSteps = plan.steps.filter((s) => !s.toDeskId).length
    const addSteps = plan.steps.filter((s) => !s.fromDeskId).length
    const swapSteps = plan.steps.filter((s) => s.swapPartnerNames && s.swapPartnerNames.length > 0).length

    // With direct swaps, removal/addition counts match exactly (no cycle vacate/seat)
    expect(plan.summary.totalSteps).toBe(plan.steps.length)
    expect(removeSteps).toBe(plan.summary.removals)
    expect(addSteps).toBe(plan.summary.newAssignments)
    expect(swapSteps).toBeGreaterThan(0)
  })

  it('handles a single person unchanged', () => {
    const original: SeatingMap = { 'd1': 'e1' }
    const target: SeatingMap = { 'd1': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(0)
    expect(plan.summary.unchanged).toBe(1)
  })

  it('correctness: complex scenario with chains, cycles, removals, and additions', () => {
    // 10 desks, mix of everything
    const original: SeatingMap = {
      'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4', 'd5': 'e5',
      'd6': null, 'd7': null, 'd8': null, 'd9': null, 'd10': null,
    }
    const target: SeatingMap = {
      'd1': 'e3', 'd2': 'e1', 'd3': 'e2', 'd4': null, 'd5': 'e5',
      'd6': 'e4', 'd7': 'e6', 'd8': null, 'd9': null, 'd10': null,
    }
    // e5 stays (unchanged), e4 moves to d6 (chain, since d6 is empty)
    // e1->d2, e2->d3, e3->d1 (3-cycle)
    // e6 newly assigned to d7
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.unchanged).toBe(1)   // e5
    expect(plan.summary.newAssignments).toBe(1) // e6
    expect(plan.summary.cyclesDetected).toBe(1) // e1/e2/e3

    const sim = simulateMoves(original, plan)
    for (const [deskId, empId] of Object.entries(target)) {
      expect(sim[deskId]).toBe(empId)
    }
  })

  it('cycle steps include swap partner names', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    // Both steps should be direct moves (no null desk IDs)
    for (const step of plan.steps) {
      expect(step.fromDeskId).not.toBeNull()
      expect(step.toDeskId).not.toBeNull()
    }

    // Each person's swap partners should name the other person
    const aliceStep = plan.steps.find((s) => s.employeeId === 'e1')!
    const bobStep = plan.steps.find((s) => s.employeeId === 'e2')!
    expect(aliceStep.swapPartnerNames).toEqual(['Bob'])
    expect(bobStep.swapPartnerNames).toEqual(['Alice'])
  })

  it('3-cycle swap partner names include both other members', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': 'e3', 'd3': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    const aliceStep = plan.steps.find((s) => s.employeeId === 'e1')!
    const bobStep = plan.steps.find((s) => s.employeeId === 'e2')!
    const carolStep = plan.steps.find((s) => s.employeeId === 'e3')!

    // Each partner list should contain the other two names
    expect(aliceStep.swapPartnerNames).toHaveLength(2)
    expect(aliceStep.swapPartnerNames).toContain('Bob')
    expect(aliceStep.swapPartnerNames).toContain('Carol')

    expect(bobStep.swapPartnerNames).toHaveLength(2)
    expect(bobStep.swapPartnerNames).toContain('Alice')
    expect(bobStep.swapPartnerNames).toContain('Carol')

    expect(carolStep.swapPartnerNames).toHaveLength(2)
    expect(carolStep.swapPartnerNames).toContain('Alice')
    expect(carolStep.swapPartnerNames).toContain('Bob')
  })

  it('swap steps have no null desk IDs (no unassigned steps)', () => {
    // 2-cycle
    const original2: SeatingMap = { 'd1': 'e1', 'd2': 'e2' }
    const target2: SeatingMap = { 'd1': 'e2', 'd2': 'e1' }
    const plan2 = computeMovePlan(original2, target2, employees)

    const vacateSteps = plan2.steps.filter((s) => s.toDeskId === null)
    const seatSteps = plan2.steps.filter((s) => s.fromDeskId === null)
    expect(vacateSteps).toHaveLength(0)
    expect(seatSteps).toHaveLength(0)

    // 4-cycle
    const original4: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4' }
    const target4: SeatingMap = { 'd1': 'e2', 'd2': 'e3', 'd3': 'e4', 'd4': 'e1' }
    const plan4 = computeMovePlan(original4, target4, employees)

    const vacateSteps4 = plan4.steps.filter((s) => s.toDeskId === null)
    const seatSteps4 = plan4.steps.filter((s) => s.fromDeskId === null)
    expect(vacateSteps4).toHaveLength(0)
    expect(seatSteps4).toHaveLength(0)
  })

  it('non-cycle steps do not have swap partner names', () => {
    // Simple move to empty desk
    const original: SeatingMap = { 'd1': 'e1', 'd2': null }
    const target: SeatingMap = { 'd1': null, 'd2': 'e1' }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].swapPartnerNames).toBeUndefined()
  })

  it('removals and new assignments do not have swap partner names', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': null }
    const target: SeatingMap = { 'd1': null, 'd2': 'e2' }
    const plan = computeMovePlan(original, target, employees)

    for (const step of plan.steps) {
      expect(step.swapPartnerNames).toBeUndefined()
    }
  })

  it('mixed scenario: swaps, direct moves, removals, and additions all coexist', () => {
    const original: SeatingMap = {
      'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4', 'd5': null,
    }
    const target: SeatingMap = {
      'd1': 'e2', 'd2': 'e1', 'd3': null, 'd4': 'e5', 'd5': 'e6',
    }
    const plan = computeMovePlan(original, target, employees)

    // e1 <-> e2 is a swap cycle
    const swapSteps = plan.steps.filter((s) => s.swapPartnerNames && s.swapPartnerNames.length > 0)
    expect(swapSteps).toHaveLength(2)

    // e3 is a removal, e4->d4 is a direct move to freed desk,
    // e5 and e6 are new assignments
    const removals = plan.steps.filter((s) => !s.toDeskId)
    expect(removals.length).toBeGreaterThanOrEqual(1) // at least e3 removal

    // No swap steps should have null desk IDs
    for (const step of swapSteps) {
      expect(step.fromDeskId).not.toBeNull()
      expect(step.toDeskId).not.toBeNull()
    }

    // Non-swap steps should not have swap partners
    const nonSwapSteps = plan.steps.filter((s) => !s.swapPartnerNames || s.swapPartnerNames.length === 0)
    for (const step of nonSwapSteps) {
      expect(step.swapPartnerNames).toBeUndefined()
    }

    // Final state matches target
    const sim = simulateMoves(original, plan)
    for (const [deskId, empId] of Object.entries(target)) {
      expect(sim[deskId]).toBe(empId)
    }
  })

  it('two independent 2-cycles have separate swap partner groups', () => {
    const original: SeatingMap = {
      'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4',
    }
    const target: SeatingMap = {
      'd1': 'e2', 'd2': 'e1', 'd3': 'e4', 'd4': 'e3',
    }
    const plan = computeMovePlan(original, target, employees)

    // e1's partner should be Bob (e2), not Carol or David
    const e1Step = plan.steps.find((s) => s.employeeId === 'e1')!
    expect(e1Step.swapPartnerNames).toEqual(['Bob'])

    // e3's partner should be David (e4), not Alice or Bob
    const e3Step = plan.steps.find((s) => s.employeeId === 'e3')!
    expect(e3Step.swapPartnerNames).toEqual(['David'])
  })

  it('swap steps use employee ID as partner name when employee is unknown', () => {
    const original: SeatingMap = { 'd1': 'unknown1', 'd2': 'unknown2' }
    const target: SeatingMap = { 'd1': 'unknown2', 'd2': 'unknown1' }
    const plan = computeMovePlan(original, target, [])

    // With no employee data, partner names fall back to IDs
    const step1 = plan.steps.find((s) => s.employeeId === 'unknown1')!
    const step2 = plan.steps.find((s) => s.employeeId === 'unknown2')!
    expect(step1.swapPartnerNames).toEqual(['unknown2'])
    expect(step2.swapPartnerNames).toEqual(['unknown1'])
  })

  it('swap steps use correct desk labels', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2' }
    const target: SeatingMap = { 'd1': 'e2', 'd2': 'e1' }
    const names = { 'd1': 'Window Seat', 'd2': 'Corner Desk' }
    const plan = computeMovePlan(original, target, employees, names)

    const aliceStep = plan.steps.find((s) => s.employeeId === 'e1')!
    expect(aliceStep.fromDeskLabel).toBe('Window Seat')
    expect(aliceStep.toDeskLabel).toBe('Corner Desk')

    const bobStep = plan.steps.find((s) => s.employeeId === 'e2')!
    expect(bobStep.fromDeskLabel).toBe('Corner Desk')
    expect(bobStep.toDeskLabel).toBe('Window Seat')
  })

  it('cycle after removal: removal frees desk, remaining form cycle', () => {
    // e4 leaves d4, e1->d2, e2->d3, e3->d1 (3-cycle), e4 removed
    const original: SeatingMap = { 'd1': 'e1', 'd2': 'e2', 'd3': 'e3', 'd4': 'e4' }
    const target: SeatingMap = { 'd1': 'e3', 'd2': 'e1', 'd3': 'e2', 'd4': null }
    const plan = computeMovePlan(original, target, employees)

    expect(plan.summary.removals).toBe(1)
    expect(plan.summary.cyclesDetected).toBe(1)

    // The removal step should not have swap partners
    const removalStep = plan.steps.find((s) => s.employeeId === 'e4')!
    expect(removalStep.swapPartnerNames).toBeUndefined()
    expect(removalStep.toDeskId).toBeNull()

    // The 3 cycle steps should have swap partners
    const swapSteps = plan.steps.filter((s) => s.swapPartnerNames && s.swapPartnerNames.length > 0)
    expect(swapSteps).toHaveLength(3)

    const sim = simulateMoves(original, plan)
    for (const [deskId, empId] of Object.entries(target)) {
      expect(sim[deskId]).toBe(empId)
    }
  })

  it('swap step count equals cycle size (no extra vacate/seat steps)', () => {
    // Verify for cycles of sizes 2 through 5
    for (let cycleSize = 2; cycleSize <= 5; cycleSize++) {
      const emps = Array.from({ length: cycleSize }, (_, i) =>
        emp(`cx${i}`, `Person${i}`)
      )
      const original: SeatingMap = {}
      const target: SeatingMap = {}
      for (let i = 0; i < cycleSize; i++) {
        original[`dx${i}`] = `cx${i}`
        // Rotate by 1: each person moves to the next desk
        target[`dx${i}`] = `cx${(i + 1) % cycleSize}`
      }
      const plan = computeMovePlan(original, target, emps)
      expect(plan.steps).toHaveLength(cycleSize)
      expect(plan.summary.cyclesDetected).toBe(1)
      // Every step should be a swap step
      for (const step of plan.steps) {
        expect(step.swapPartnerNames).toHaveLength(cycleSize - 1)
        expect(step.fromDeskId).not.toBeNull()
        expect(step.toDeskId).not.toBeNull()
      }
    }
  })

  it('new assignments come after all other moves', () => {
    const original: SeatingMap = { 'd1': 'e1', 'd2': null, 'd3': null }
    const target: SeatingMap = { 'd1': null, 'd2': 'e2', 'd3': 'e3' }
    const plan = computeMovePlan(original, target, employees)

    // e1 removal should come first
    const removalStep = plan.steps.find((s) => s.employeeId === 'e1')
    const newSteps = plan.steps.filter((s) => !s.fromDeskId && s.toDeskId)

    expect(removalStep).toBeDefined()
    for (const ns of newSteps) {
      expect(removalStep!.step).toBeLessThan(ns.step)
    }
  })
})

// ─── Move Plan URL Encoding ────────────────────────────────────────────────

describe('encodeMovePlanPayload / decodeMovePlanPayload', () => {
  const payload: MovePlanPayload = {
    originalSeating: { 'z1-d0': 'e1', 'z1-d1': 'e2' },
    newSeating: { 'z1-d0': 'e2', 'z1-d1': 'e1' },
    employees: defaultEmployees.slice(0, 5),
    zones,
    deskNames: { 'z1-d0': 'Corner' },
    departmentColors: { Engineering: '#3b82f6' },
  }

  it('round-trips a move plan payload', () => {
    const encoded = encodeMovePlanPayload(payload)
    const decoded = decodeMovePlanPayload(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.zones).toEqual(zones)
    expect(decoded!.employees).toEqual(payload.employees)
    expect(decoded!.deskNames).toEqual({ 'z1-d0': 'Corner' })
    expect(decoded!.departmentColors).toEqual({ Engineering: '#3b82f6' })
    expect(decoded!.originalSeating['z1-d0']).toBe('e1')
    expect(decoded!.originalSeating['z1-d1']).toBe('e2')
    expect(decoded!.newSeating['z1-d0']).toBe('e2')
    expect(decoded!.newSeating['z1-d1']).toBe('e1')
  })

  it('produces a URL-safe string', () => {
    const encoded = encodeMovePlanPayload(payload)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('returns null for invalid encoded string', () => {
    expect(decodeMovePlanPayload('!!!invalid!!!')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeMovePlanPayload('')).toBeNull()
  })

  it('round-trips payload without desk names or dept colors', () => {
    const minimal: MovePlanPayload = {
      originalSeating: { 'z1-d0': 'e1' },
      newSeating: { 'z1-d0': null },
      employees: [defaultEmployees[0]],
      zones,
      deskNames: {},
      departmentColors: {},
    }
    const encoded = encodeMovePlanPayload(minimal)
    const decoded = decodeMovePlanPayload(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.deskNames).toEqual({})
    expect(decoded!.departmentColors).toEqual({})
    expect(decoded!.originalSeating['z1-d0']).toBe('e1')
  })

  it('round-trips with the default seating data', () => {
    const full: MovePlanPayload = {
      originalSeating: defaultSeating,
      newSeating: { ...defaultSeating, 'z1-d0': 'e2', 'z1-d1': 'e1' },
      employees: defaultEmployees,
      zones,
      deskNames: {},
      departmentColors: {},
    }
    const encoded = encodeMovePlanPayload(full)
    const decoded = decodeMovePlanPayload(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.originalSeating['z1-d0']).toBe('e1')
    expect(decoded!.newSeating['z1-d0']).toBe('e2')
    expect(decoded!.employees).toHaveLength(defaultEmployees.length)
  })
})

describe('buildMovePlanUrl', () => {
  it('produces a URL with a #moveplan= hash', () => {
    const payload: MovePlanPayload = {
      originalSeating: { 'z1-d0': 'e1' },
      newSeating: { 'z1-d0': 'e2' },
      employees: defaultEmployees.slice(0, 2),
      zones,
      deskNames: {},
      departmentColors: {},
    }
    const url = buildMovePlanUrl(payload)
    expect(url).toContain('#moveplan=')
    const hash = url.split('#moveplan=')[1]
    expect(hash.length).toBeGreaterThan(0)
  })
})

describe('getMovePlanData', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('returns null when no hash is present', () => {
    expect(getMovePlanData()).toBeNull()
  })

  it('returns null for a non-moveplan hash', () => {
    window.location.hash = '#share=something'
    expect(getMovePlanData()).toBeNull()
  })

  it('decodes a valid moveplan hash', () => {
    const payload: MovePlanPayload = {
      originalSeating: { 'z1-d0': 'e1' },
      newSeating: { 'z1-d0': 'e2' },
      employees: defaultEmployees.slice(0, 2),
      zones,
      deskNames: {},
      departmentColors: {},
    }
    const encoded = encodeMovePlanPayload(payload)
    window.location.hash = `#moveplan=${encoded}`

    const result = getMovePlanData()
    expect(result).not.toBeNull()
    expect(result!.originalSeating['z1-d0']).toBe('e1')
    expect(result!.newSeating['z1-d0']).toBe('e2')
  })
})

// ─── End-to-End: Encode + Compute ──────────────────────────────────────────

describe('end-to-end: encode payload, decode, compute plan', () => {
  it('move plan computed from decoded payload matches direct computation', () => {
    const original: SeatingMap = { 'z1-d0': 'e1', 'z1-d1': 'e2', 'z1-d2': null }
    const target: SeatingMap = { 'z1-d0': 'e2', 'z1-d1': null, 'z1-d2': 'e1' }
    const emps = defaultEmployees.slice(0, 2)

    // Direct computation
    const directPlan = computeMovePlan(original, target, emps)

    // Via encode/decode round-trip
    const payload: MovePlanPayload = {
      originalSeating: original,
      newSeating: target,
      employees: emps,
      zones,
      deskNames: {},
      departmentColors: {},
    }
    const encoded = encodeMovePlanPayload(payload)
    const decoded = decodeMovePlanPayload(encoded)!
    const roundTripPlan = computeMovePlan(
      decoded.originalSeating,
      decoded.newSeating,
      decoded.employees,
      decoded.deskNames,
    )

    expect(roundTripPlan.summary).toEqual(directPlan.summary)
    expect(roundTripPlan.steps.length).toBe(directPlan.steps.length)
  })

  it('large layout: all employees rearranged', () => {
    // Use the full default dataset
    const original = { ...defaultSeating }
    // Reverse the assignments
    const entries = Object.entries(original).filter(([, v]) => v != null)
    const empIds = entries.map(([, v]) => v!)
    const reversed = [...empIds].reverse()
    const target: SeatingMap = {}
    for (const key of Object.keys(original)) {
      target[key] = null
    }
    entries.forEach(([deskId], i) => {
      target[deskId] = reversed[i]
    })

    const plan = computeMovePlan(original, target, defaultEmployees)
    const sim = simulateMoves(original, plan)

    for (const [deskId, empId] of Object.entries(target)) {
      expect(sim[deskId]).toBe(empId)
    }
  })
})

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Simulate executing the move steps against the original seating.
 * Verifies that each step is valid (no conflicts).
 * Swap steps (with swapPartnerNames) are processed atomically as a group.
 */
function simulateMoves(original: SeatingMap, plan: MovePlan): SeatingMap {
  const state: SeatingMap = { ...original }
  // Register desks that might only exist in the plan
  for (const step of plan.steps) {
    if (step.toDeskId && !(step.toDeskId in state)) {
      state[step.toDeskId] = null
    }
  }

  let i = 0
  while (i < plan.steps.length) {
    const step = plan.steps[i]

    if (step.swapPartnerNames && step.swapPartnerNames.length > 0) {
      // Collect all consecutive swap steps in this group
      const group = [step]
      let j = i + 1
      while (j < plan.steps.length && plan.steps[j].swapPartnerNames && plan.steps[j].swapPartnerNames!.length > 0) {
        group.push(plan.steps[j])
        j++
      }

      // Verify all source employees are at their desks
      for (const s of group) {
        expect(state[s.fromDeskId!]).toBe(s.employeeId)
      }

      // Process atomically: clear all sources, then set all targets
      for (const s of group) {
        state[s.fromDeskId!] = null
      }
      for (const s of group) {
        expect(state[s.toDeskId!]).toBeNull()
        state[s.toDeskId!] = s.employeeId
      }

      i = j
    } else {
      // Regular sequential step
      if (step.fromDeskId) {
        expect(state[step.fromDeskId]).toBe(step.employeeId)
        state[step.fromDeskId] = null
      }

      if (step.toDeskId) {
        expect(state[step.toDeskId]).toBeNull()
        state[step.toDeskId] = step.employeeId
      }

      i++
    }
  }

  return state
}
