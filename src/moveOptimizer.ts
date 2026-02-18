import type { Employee, SeatingMap, DeskNameMap } from './types'

export interface MoveStep {
  step: number
  employeeId: string
  employeeName: string
  fromDeskId: string | null
  toDeskId: string | null
  fromDeskLabel: string
  toDeskLabel: string
  swapPartnerNames?: string[]
}

export interface MovePlanSummary {
  totalSteps: number
  peopleMoving: number
  newAssignments: number
  removals: number
  unchanged: number
  cyclesDetected: number
}

export interface MovePlan {
  steps: MoveStep[]
  summary: MovePlanSummary
}

function getDeskLabel(deskId: string, deskNames?: DeskNameMap): string {
  if (deskNames && deskNames[deskId]) return deskNames[deskId]
  // Format "z1-d3" as "Z1-D3"
  return deskId
    .split('-')
    .map((p) => p.toUpperCase())
    .join('-')
}

/**
 * Compute the optimal ordered move plan to transition from one seating
 * arrangement to another, minimizing conflicts and temporary relocations.
 *
 * The algorithm works in four phases:
 * 1. Removals: people leaving their desk (frees space)
 * 2. Direct moves: people moving to currently-vacant desks (iterative)
 * 3. Cycle breaks: remaining moves form cycles; break each with a temp vacate
 * 4. New assignments: people sitting down at a desk for the first time
 */
export function computeMovePlan(
  originalSeating: SeatingMap,
  newSeating: SeatingMap,
  employees: Employee[],
  deskNames?: DeskNameMap,
): MovePlan {
  const empMap = new Map(employees.map((e) => [e.id, e]))

  // Build employee -> desk lookups
  const empCurrentDesk = new Map<string, string>()
  const empTargetDesk = new Map<string, string>()

  for (const [deskId, empId] of Object.entries(originalSeating)) {
    if (empId) empCurrentDesk.set(empId, deskId)
  }
  for (const [deskId, empId] of Object.entries(newSeating)) {
    if (empId) empTargetDesk.set(empId, deskId)
  }

  // Categorize every employee
  const allEmpIds = new Set([...empCurrentDesk.keys(), ...empTargetDesk.keys()])
  const needsMove: string[] = []
  const newlyAssigned: string[] = []
  const removed: string[] = []
  let unchangedCount = 0

  for (const empId of allEmpIds) {
    const cur = empCurrentDesk.get(empId)
    const tgt = empTargetDesk.get(empId)
    if (cur && tgt) {
      if (cur === tgt) {
        unchangedCount++
      } else {
        needsMove.push(empId)
      }
    } else if (!cur && tgt) {
      newlyAssigned.push(empId)
    } else if (cur && !tgt) {
      removed.push(empId)
    }
  }

  const steps: MoveStep[] = []
  let stepNum = 1

  // Track live desk occupancy (mutable simulation)
  const occupancy = new Map<string, string | null>()
  for (const [deskId, empId] of Object.entries(originalSeating)) {
    occupancy.set(deskId, empId || null)
  }
  // Also register desks that only exist in the new layout
  for (const deskId of Object.keys(newSeating)) {
    if (!occupancy.has(deskId)) {
      occupancy.set(deskId, null)
    }
  }

  // Helper: is a desk currently vacant?
  const isVacant = (deskId: string): boolean => !occupancy.get(deskId)

  // Helper: add a move step and update occupancy
  const doMove = (empId: string, from: string | null, to: string | null) => {
    const emp = empMap.get(empId)
    steps.push({
      step: stepNum++,
      employeeId: empId,
      employeeName: emp?.name ?? empId,
      fromDeskId: from,
      toDeskId: to,
      fromDeskLabel: from ? getDeskLabel(from, deskNames) : 'Unassigned',
      toDeskLabel: to ? getDeskLabel(to, deskNames) : 'Unassigned',
    })
    if (from) occupancy.set(from, null)
    if (to) occupancy.set(to, empId)
  }

  // --- Phase 1: Removals (people leaving) ---
  for (const empId of removed) {
    const desk = empCurrentDesk.get(empId)!
    doMove(empId, desk, null)
  }

  // --- Phase 2: Iterative direct moves ---
  // Repeatedly find employees whose target desk is currently vacant.
  const remaining = new Set(needsMove)
  let changed = true
  while (changed) {
    changed = false
    for (const empId of remaining) {
      const targetDesk = empTargetDesk.get(empId)!
      if (isVacant(targetDesk)) {
        const fromDesk = empCurrentDesk.get(empId)!
        doMove(empId, fromDesk, targetDesk)
        remaining.delete(empId)
        changed = true
      }
    }
  }

  // --- Phase 3: Break cycles ---
  // All remaining employees form disjoint cycles in the permutation.
  // Instead of vacating to a temp spot, show all cycle members as
  // simultaneous swaps with partner annotations.
  let cyclesDetected = 0
  while (remaining.size > 0) {
    cyclesDetected++

    // Pick any starting employee and trace the cycle
    const startEmpId = remaining.values().next().value!
    const cycle: string[] = [startEmpId]
    let currentEmpId = startEmpId

    // Follow the chain: who is sitting at my target desk?
    while (true) {
      const targetDesk = empTargetDesk.get(currentEmpId)!
      const blocker = occupancy.get(targetDesk)
      if (!blocker || blocker === startEmpId) break
      cycle.push(blocker)
      currentEmpId = blocker
    }

    // Build partner name lists for each member
    const cyclePartnerNames = cycle.map((empId) => {
      const others = cycle.filter((id) => id !== empId)
      return others.map((id) => empMap.get(id)?.name ?? id)
    })

    // Emit one direct move per cycle member (these happen simultaneously)
    // First, clear all source desks, then set all target desks
    const cycleFromDesks = cycle.map((empId) => empCurrentDesk.get(empId)!)
    const cycleToDesks = cycle.map((empId) => empTargetDesk.get(empId)!)

    for (const fromDesk of cycleFromDesks) {
      occupancy.set(fromDesk, null)
    }
    for (let i = 0; i < cycle.length; i++) {
      occupancy.set(cycleToDesks[i], cycle[i])
    }

    for (let i = 0; i < cycle.length; i++) {
      const empId = cycle[i]
      const emp = empMap.get(empId)
      steps.push({
        step: stepNum++,
        employeeId: empId,
        employeeName: emp?.name ?? empId,
        fromDeskId: cycleFromDesks[i],
        toDeskId: cycleToDesks[i],
        fromDeskLabel: getDeskLabel(cycleFromDesks[i], deskNames),
        toDeskLabel: getDeskLabel(cycleToDesks[i], deskNames),
        swapPartnerNames: cyclePartnerNames[i],
      })
      remaining.delete(empId)
      empCurrentDesk.set(empId, cycleToDesks[i])
    }
  }

  // --- Phase 4: New assignments ---
  for (const empId of newlyAssigned) {
    const targetDesk = empTargetDesk.get(empId)!
    doMove(empId, null, targetDesk)
  }

  return {
    steps,
    summary: {
      totalSteps: steps.length,
      peopleMoving: needsMove.length,
      newAssignments: newlyAssigned.length,
      removals: removed.length,
      unchanged: unchangedCount,
      cyclesDetected,
    },
  }
}
