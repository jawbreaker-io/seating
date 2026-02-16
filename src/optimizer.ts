import type { Desk, Employee, SeatingMap, PinnedDeskMap, UnavailableDeskMap, OptimizationMode, OptimizationResult } from './types'

/**
 * Calculate a clustering score for a seating arrangement.
 * Higher score = better department clustering.
 * For each seated employee, count how many neighbors (same zone) share the same department.
 */
export function clusterScore(seating: SeatingMap, desks: Desk[], employees: Employee[]): number {
  const employeeMap = new Map(employees.map((e) => [e.id, e]))
  const deskById = new Map(desks.map((d) => [d.id, d]))
  const zoneDesks = new Map<string, Desk[]>()
  for (const d of desks) {
    const arr = zoneDesks.get(d.zone) ?? []
    arr.push(d)
    zoneDesks.set(d.zone, arr)
  }

  let score = 0

  for (const [deskId, empId] of Object.entries(seating)) {
    if (!empId) continue
    const emp = employeeMap.get(empId)
    if (!emp) continue
    const desk = deskById.get(deskId)
    if (!desk) continue

    // Check all desks in the same zone
    const neighbors = zoneDesks.get(desk.zone) ?? []
    for (const neighbor of neighbors) {
      if (neighbor.id === deskId) continue
      const neighborEmpId = seating[neighbor.id]
      if (!neighborEmpId) continue
      const neighborEmp = employeeMap.get(neighborEmpId)
      if (!neighborEmp) continue

      if (neighborEmp.department === emp.department) {
        // Adjacent desks (within 1 step in grid) get higher bonus
        const rowDist = Math.abs(desk.row - neighbor.row)
        const colDist = Math.abs(desk.col - neighbor.col)
        if (rowDist <= 1 && colDist <= 1) {
          score += 3 // Adjacent
        } else {
          score += 1 // Same zone but not adjacent
        }
      }
    }
  }

  // Divide by 2 since each pair is counted twice
  return score / 2
}

/**
 * Count how many employees moved between two seating arrangements.
 */
export function countMoves(before: SeatingMap, after: SeatingMap): number {
  const beforeByEmp = new Map<string, string>()
  for (const [deskId, empId] of Object.entries(before)) {
    if (empId) beforeByEmp.set(empId, deskId)
  }

  let moves = 0
  for (const [deskId, empId] of Object.entries(after)) {
    if (!empId) continue
    const prevDesk = beforeByEmp.get(empId)
    if (prevDesk !== deskId) {
      moves++
    }
  }
  return moves
}

/**
 * Full optimization: group employees by department and pack them into zones.
 * Pinned employees stay in place. Unavailable desks are skipped.
 */
function optimizeFull(
  currentSeating: SeatingMap,
  desks: Desk[],
  pinnedDesks: PinnedDeskMap,
  unavailableDesks: UnavailableDeskMap,
  employees: Employee[],
): SeatingMap {
  const employeeMap = new Map(employees.map((e) => [e.id, e]))
  const result: SeatingMap = {}
  for (const d of desks) {
    result[d.id] = null
  }

  // Lock pinned employees in place
  const placedEmployees = new Set<string>()
  for (const d of desks) {
    if (pinnedDesks[d.id] && currentSeating[d.id]) {
      result[d.id] = currentSeating[d.id]
      placedEmployees.add(currentSeating[d.id]!)
    }
  }

  // Get available desks per zone (not pinned, not unavailable)
  const zones = [...new Set(desks.map((d) => d.zone))]
  const availableDesksByZone = new Map<string, Desk[]>()
  for (const zone of zones) {
    const zoneAvailable = desks.filter(
      (d) => d.zone === zone && !pinnedDesks[d.id] && !unavailableDesks[d.id],
    )
    // Sort desks by row then column for contiguous placement
    zoneAvailable.sort((a, b) => a.row - b.row || a.col - b.col)
    availableDesksByZone.set(zone, zoneAvailable)
  }

  // Group unplaced employees by department
  const assignedEmpIds = new Set(
    Object.entries(currentSeating)
      .filter(([, empId]) => empId)
      .map(([, empId]) => empId!),
  )
  const allRelevant = employees.filter(
    (e) => !placedEmployees.has(e.id) && assignedEmpIds.has(e.id),
  )

  const deptGroups = new Map<string, string[]>()
  for (const emp of allRelevant) {
    const group = deptGroups.get(emp.department) ?? []
    group.push(emp.id)
    deptGroups.set(emp.department, group)
  }

  // Sort departments by size (largest first) to prioritize packing big teams together
  const sortedDepts = [...deptGroups.entries()].sort((a, b) => b[1].length - a[1].length)

  // Count how many pinned employees per department are already in each zone
  const deptZoneAffinity = new Map<string, Map<string, number>>()
  for (const d of desks) {
    if (pinnedDesks[d.id] && result[d.id]) {
      const emp = employeeMap.get(result[d.id]!)
      if (emp) {
        const zoneMap = deptZoneAffinity.get(emp.department) ?? new Map()
        zoneMap.set(d.zone, (zoneMap.get(d.zone) ?? 0) + 1)
        deptZoneAffinity.set(emp.department, zoneMap)
      }
    }
  }

  // Assign each department to the zone with the most available space
  // (or where pinned members already are)
  for (const [dept, empIds] of sortedDepts) {
    const affinity = deptZoneAffinity.get(dept)

    // Score each zone for this department
    const zoneScores = zones.map((zone) => {
      const available = availableDesksByZone.get(zone) ?? []
      const affinityCount = affinity?.get(zone) ?? 0
      return { zone, available: available.length, affinity: affinityCount }
    })

    // Prefer zones with existing pinned members, then most space
    zoneScores.sort((a, b) => {
      if (b.affinity !== a.affinity) return b.affinity - a.affinity
      return b.available - a.available
    })

    const remaining = [...empIds]
    for (const { zone } of zoneScores) {
      if (remaining.length === 0) break
      const available = availableDesksByZone.get(zone) ?? []
      while (remaining.length > 0 && available.length > 0) {
        const empId = remaining.shift()!
        const desk = available.shift()!
        result[desk.id] = empId
        placedEmployees.add(empId)
      }
      availableDesksByZone.set(zone, available)
    }
  }

  // Place any remaining unassigned employees into any available desk
  const unplaced = employees.filter(
    (e) => !placedEmployees.has(e.id) && assignedEmpIds.has(e.id),
  )
  for (const emp of unplaced) {
    for (const zone of zones) {
      const available = availableDesksByZone.get(zone) ?? []
      if (available.length > 0) {
        const desk = available.shift()!
        result[desk.id] = emp.id
        availableDesksByZone.set(zone, available)
        break
      }
    }
  }

  // Refine the initial placement with greedy swaps to maximize adjacency score
  const movableDeskIds = desks
    .filter((d) => !pinnedDesks[d.id] && !unavailableDesks[d.id])
    .map((d) => d.id)

  return refineBySwapping(result, desks, movableDeskIds, 200, employees)
}

/**
 * Greedy swap refinement: iteratively find the best pair swap that improves
 * the clustering score, and apply it. Repeat until no improvement is found
 * or maxIterations is reached.
 */
function refineBySwapping(
  seating: SeatingMap,
  desks: Desk[],
  movableDeskIds: string[],
  maxIterations: number,
  employees: Employee[],
): SeatingMap {
  const result = { ...seating }

  let improved = true
  let iterations = 0

  while (improved && iterations < maxIterations) {
    improved = false
    iterations++
    let bestSwap: [string, string] | null = null
    let bestGain = 0

    // Try all pairs of movable desks
    for (let i = 0; i < movableDeskIds.length; i++) {
      for (let j = i + 1; j < movableDeskIds.length; j++) {
        const deskA = movableDeskIds[i]
        const deskB = movableDeskIds[j]
        const empA = result[deskA]
        const empB = result[deskB]

        // Skip if both empty or same employee
        if (!empA && !empB) continue
        if (empA === empB) continue

        // Calculate score before swap
        const scoreBefore = clusterScore(result, desks, employees)

        // Perform swap temporarily
        result[deskA] = empB
        result[deskB] = empA

        const scoreAfter = clusterScore(result, desks, employees)
        const gain = scoreAfter - scoreBefore

        // Revert swap
        result[deskA] = empA
        result[deskB] = empB

        if (gain > bestGain) {
          bestGain = gain
          bestSwap = [deskA, deskB]
        }
      }
    }

    if (bestSwap && bestGain > 0) {
      const [a, b] = bestSwap
      const tmp = result[a]
      result[a] = result[b]
      result[b] = tmp
      improved = true
    }
  }

  return result
}

/**
 * Minimize-moves optimization: iteratively swap employees to improve clustering
 * while keeping the total number of moves low.
 * Uses a greedy approach: find the best swap, apply it, repeat.
 */
function optimizeMinimizeMoves(
  currentSeating: SeatingMap,
  desks: Desk[],
  pinnedDesks: PinnedDeskMap,
  unavailableDesks: UnavailableDeskMap,
  employees: Employee[],
): SeatingMap {
  const movableDeskIds = desks
    .filter((d) => !pinnedDesks[d.id] && !unavailableDesks[d.id])
    .map((d) => d.id)

  return refineBySwapping(currentSeating, desks, movableDeskIds, 200, employees)
}

/**
 * Run the seating optimization with the given mode.
 */
export function optimizeSeating(
  currentSeating: SeatingMap,
  desks: Desk[],
  pinnedDesks: PinnedDeskMap,
  unavailableDesks: UnavailableDeskMap,
  mode: OptimizationMode,
  employees: Employee[],
): OptimizationResult {
  const previousScore = clusterScore(currentSeating, desks, employees)

  const optimized =
    mode === 'full'
      ? optimizeFull(currentSeating, desks, pinnedDesks, unavailableDesks, employees)
      : optimizeMinimizeMoves(currentSeating, desks, pinnedDesks, unavailableDesks, employees)

  return {
    seating: optimized,
    moves: countMoves(currentSeating, optimized),
    clusterScore: clusterScore(optimized, desks, employees),
    previousScore,
  }
}
