import { jsPDF } from 'jspdf'
import type { Desk, Employee, Zone, SeatingMap, DeskNameMap, UnavailableDeskMap, PinnedDeskMap } from './types'
import { desks as defaultDesks, generateDesks, getDepartmentColor } from './data'

/** Data included in a shareable link. */
export interface SharePayload {
  zones: Zone[]
  seating: SeatingMap
  deskNames: DeskNameMap
  unavailableDesks: UnavailableDeskMap
  pinnedDesks?: PinnedDeskMap
  employees?: Employee[]
  departmentColors?: Record<string, string>
}

/**
 * Validate a SeatingMap, stripping any entries with unknown desk or employee IDs.
 * Returns a clean SeatingMap with all known desks present (null for empty).
 */
export function validateSeating(
  raw: Record<string, unknown>,
  desks: Desk[] = defaultDesks,
  employees?: Employee[],
): SeatingMap {
  const validDeskIds = new Set(desks.map((d) => d.id))
  const validEmployeeIds = employees ? new Set(employees.map((e) => e.id)) : null
  const seating: SeatingMap = {}
  for (const desk of desks) {
    seating[desk.id] = null
  }
  for (const [deskId, empId] of Object.entries(raw)) {
    if (
      validDeskIds.has(deskId) &&
      typeof empId === 'string' &&
      (!validEmployeeIds || validEmployeeIds.has(empId))
    ) {
      seating[deskId] = empId
    }
  }
  return seating
}

/**
 * Encode a SeatingMap into a compact URL-safe string.
 * Format: base64url of "deskId:empId,deskId:empId,..." for non-null assignments.
 */
export function encodeSeating(seating: SeatingMap): string {
  const pairs = Object.entries(seating)
    .filter(([, empId]) => empId != null)
    .map(([deskId, empId]) => `${deskId}:${empId}`)
    .sort()
    .join(',')
  return btoa(pairs).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a URL-safe string back into a SeatingMap.
 * Returns null if the string is invalid.
 */
export function decodeSeating(
  encoded: string,
  desks: Desk[] = defaultDesks,
): SeatingMap | null {
  try {
    if (!encoded) return validateSeating({}, desks)

    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(padded)
    const raw: Record<string, string> = {}

    if (decoded) {
      for (const pair of decoded.split(',')) {
        const [deskId, empId] = pair.split(':')
        if (deskId && empId) {
          raw[deskId] = empId
        }
      }
    }

    return validateSeating(raw, desks)
  } catch {
    return null
  }
}

/**
 * Encode a full share payload (zones + seating + desk names + unavailable desks + employees + dept colors)
 * into a compact URL-safe base64url string.
 */
export function encodeSharePayload(payload: SharePayload): string {
  const compact: Record<string, unknown> = {
    z: payload.zones,
    s: Object.fromEntries(
      Object.entries(payload.seating).filter(([, v]) => v != null),
    ),
  }
  if (Object.keys(payload.deskNames).length > 0) {
    compact.n = payload.deskNames
  }
  if (Object.keys(payload.unavailableDesks).length > 0) {
    compact.u = payload.unavailableDesks
  }
  if (payload.pinnedDesks && Object.keys(payload.pinnedDesks).length > 0) {
    compact.p = payload.pinnedDesks
  }
  if (payload.employees && payload.employees.length > 0) {
    compact.e = payload.employees
  }
  if (payload.departmentColors && Object.keys(payload.departmentColors).length > 0) {
    compact.dc = payload.departmentColors
  }
  const json = JSON.stringify(compact)
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a base64url string back into a SharePayload.
 * Falls back to the legacy seating-only format for old links.
 */
export function decodeSharePayload(
  encoded: string,
  desks: Desk[] = defaultDesks,
): SharePayload | null {
  try {
    if (!encoded) return null

    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(padded)

    // Try JSON format first (new format)
    if (decoded.startsWith('{')) {
      const parsed = JSON.parse(decoded)
      const zones: Zone[] = parsed.z ?? []
      const generatedDesks = zones.length > 0 ? generateDesks(zones) : desks
      const sharedEmployees: Employee[] | undefined = parsed.e
      const departmentColors: Record<string, string> | undefined = parsed.dc
      const seating = validateSeating(parsed.s ?? {}, generatedDesks, sharedEmployees)
      const deskNames: DeskNameMap = parsed.n ?? {}
      const unavailableDesks: UnavailableDeskMap = parsed.u ?? {}
      const pinnedDesks: PinnedDeskMap = parsed.p ?? {}
      return { zones, seating, deskNames, unavailableDesks, pinnedDesks, employees: sharedEmployees, departmentColors }
    }

    // Legacy format: comma-separated deskId:empId pairs
    const seating = decodeSeating(encoded, desks)
    if (!seating) return null
    return { zones: [], seating, deskNames: {}, unavailableDesks: {} }
  } catch {
    return null
  }
}

/** Build a shareable URL from the current arrangement and layout. */
export function buildShareUrl(payload: SharePayload): string {
  const encoded = encodeSharePayload(payload)
  const url = new URL(window.location.href)
  url.hash = `share=${encoded}`
  return url.toString()
}

/** Extract shared data from the current URL hash, if present. */
export function getSharedData(): SharePayload | null {
  const hash = window.location.hash
  const match = hash.match(/^#share=(.+)$/)
  if (!match) return null
  return decodeSharePayload(match[1])
}

/** Export the full config (seating, zones, people, etc.) as a downloadable JSON file. */
export function exportSeatingJson(payload: SharePayload) {
  const data = JSON.stringify(payload, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'seating-arrangement.json'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parse a JSON config object into a SharePayload.
 * Handles both legacy (SeatingMap-only) and full payload formats.
 */
export function parseJsonConfig(
  parsed: Record<string, unknown>,
  desks?: Desk[],
): SharePayload {
  // Full payload format: has 'zones' or 'seating' keys
  if (Array.isArray(parsed.zones) || parsed.seating !== undefined) {
    const zones: Zone[] = (parsed.zones as Zone[]) ?? []
    const resolvedDesks = zones.length > 0 ? generateDesks(zones) : (desks ?? defaultDesks)
    const sharedEmployees: Employee[] | undefined = parsed.employees as Employee[] | undefined
    const departmentColors = parsed.departmentColors as Record<string, string> | undefined
    const rawSeating = (parsed.seating ?? {}) as Record<string, unknown>
    const seating = validateSeating(rawSeating, resolvedDesks, sharedEmployees)
    const deskNames: DeskNameMap = (parsed.deskNames as DeskNameMap) ?? {}
    const unavailableDesks: UnavailableDeskMap = (parsed.unavailableDesks as UnavailableDeskMap) ?? {}
    const pinnedDesks: PinnedDeskMap = (parsed.pinnedDesks as PinnedDeskMap) ?? {}
    return { zones, seating, deskNames, unavailableDesks, pinnedDesks, employees: sharedEmployees, departmentColors }
  }

  // Legacy format: plain SeatingMap object (deskId -> employeeId)
  const resolvedDesks = desks ?? defaultDesks
  const seating = validateSeating(parsed, resolvedDesks)
  return { zones: [], seating, deskNames: {}, unavailableDesks: {} }
}

/** Import a config from a JSON file. Returns a promise with the full SharePayload. */
export function importSeatingJson(
  desks: Desk[] = defaultDesks,
): Promise<SharePayload> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          if (typeof parsed !== 'object' || parsed === null) {
            reject(new Error('Invalid seating file'))
            return
          }
          resolve(parseJsonConfig(parsed as Record<string, unknown>, desks))
        } catch {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    }
    input.click()
  })
}

export interface PdfExportData {
  seating: SeatingMap
  zones: Zone[]
  desks: Desk[]
  deskNames: DeskNameMap
  unavailableDesks: UnavailableDeskMap
  employees: Employee[]
  departmentColors: Record<string, string>
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/** Export the seating arrangement as a downloadable PDF file. */
export function exportSeatingPdf(data: PdfExportData) {
  const { seating, zones, desks, deskNames, unavailableDesks, employees, departmentColors } = data
  const employeeMap = new Map(employees.map((e) => [e.id, e]))
  const getColor = (dept: string) => getDepartmentColor(dept, departmentColors)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = 210
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  function checkPage(needed: number) {
    if (y + needed > 282) {
      doc.addPage()
      y = margin
    }
  }

  // --- Title ---
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Office Seating Chart', margin, y + 7)
  y += 12

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Exported ${new Date().toLocaleDateString()}`, margin, y)
  y += 8

  // --- Summary stats ---
  const assigned = Object.values(seating).filter(Boolean).length
  const totalDesks = desks.length
  const unavailableCount = Object.keys(unavailableDesks).length
  const availableDesks = totalDesks - unavailableCount
  const totalPeople = employees.length

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, margin + contentWidth, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const stats = [
    `${assigned} seated`,
    `${totalPeople - assigned} unassigned`,
    `${availableDesks - assigned} empty desks`,
    ...(unavailableCount > 0 ? [`${unavailableCount} unavailable`] : []),
  ]
  doc.text(stats.join('   •   '), margin, y)
  y += 10

  // --- Zone grids ---
  for (const zone of zones) {
    const zoneDesks = desks.filter((d) => d.zone === zone.id)
    const cellW = Math.min(38, (contentWidth - (zone.cols - 1) * 2) / zone.cols)
    const cellH = 18
    const gridHeight = zone.rows * cellH + (zone.rows - 1) * 2
    const zoneHeight = gridHeight + 12

    checkPage(zoneHeight)

    // Zone heading
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50, 50, 50)
    doc.text(zone.name, margin, y + 4)
    y += 8

    // Zone background
    const bgColor = hexToRgb(zone.color)
    const gridWidth = zone.cols * cellW + (zone.cols - 1) * 2
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
    doc.roundedRect(margin - 2, y - 2, gridWidth + 4, gridHeight + 4, 2, 2, 'F')

    // Draw desk cells
    for (const desk of zoneDesks) {
      const cx = margin + desk.col * (cellW + 2)
      const cy = y + desk.row * (cellH + 2)
      const isUnavailable = !!unavailableDesks[desk.id]
      const empId = seating[desk.id]
      const emp = empId ? employeeMap.get(empId) : null

      // Cell background
      if (isUnavailable) {
        doc.setFillColor(229, 231, 235)
      } else if (emp) {
        doc.setFillColor(255, 255, 255)
      } else {
        doc.setFillColor(249, 250, 251)
      }
      doc.roundedRect(cx, cy, cellW, cellH, 1.5, 1.5, 'F')

      // Cell border
      doc.setDrawColor(210, 210, 210)
      doc.roundedRect(cx, cy, cellW, cellH, 1.5, 1.5, 'S')

      if (isUnavailable) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(160, 160, 160)
        doc.text('N/A', cx + cellW / 2, cy + cellH / 2 + 1, { align: 'center' })
      } else if (emp) {
        // Department color bar
        const deptColor = hexToRgb(getColor(emp.department))
        doc.setFillColor(deptColor[0], deptColor[1], deptColor[2])
        doc.rect(cx, cy, cellW, 2.5, 'F')

        // Employee name
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        const displayName = emp.name.length > 14 ? emp.name.substring(0, 13) + '…' : emp.name
        doc.text(displayName, cx + 2, cy + 7.5)

        // Department
        doc.setFontSize(5.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(emp.department, cx + 2, cy + 11)

        // Desk label
        const deskLabel = deskNames[desk.id] || desk.id
        doc.setFontSize(5)
        doc.setTextColor(150, 150, 150)
        doc.text(deskLabel, cx + 2, cy + 15)
      } else {
        // Empty desk
        const deskLabel = deskNames[desk.id] || desk.id
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(180, 180, 180)
        doc.text(deskLabel, cx + cellW / 2, cy + cellH / 2 + 1, { align: 'center' })
      }
    }

    y += gridHeight + 10
  }

  // --- Employee Directory ---
  checkPage(30)

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, margin + contentWidth, y)
  y += 6

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('Employee Directory', margin, y + 4)
  y += 10

  // Table header
  const colX = [margin, margin + 55, margin + 100, margin + 140]
  doc.setFillColor(243, 244, 246)
  doc.rect(margin, y - 1, contentWidth, 7, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('Employee', colX[0] + 2, y + 3.5)
  doc.text('Department', colX[1] + 2, y + 3.5)
  doc.text('Desk', colX[2] + 2, y + 3.5)
  doc.text('Zone', colX[3] + 2, y + 3.5)
  y += 9

  // Table rows
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name))
  for (const emp of sortedEmployees) {
    checkPage(7)

    const deskEntry = Object.entries(seating).find(([, eid]) => eid === emp.id)
    const deskId = deskEntry ? deskEntry[0] : null
    const desk = deskId ? desks.find((d) => d.id === deskId) : null
    const zone = desk ? zones.find((z) => z.id === desk.zone) : null
    const deskLabel = deskId ? (deskNames[deskId] || deskId) : '—'
    const zoneLabel = zone ? zone.name : '—'

    // Alternating row background
    if (sortedEmployees.indexOf(emp) % 2 === 0) {
      doc.setFillColor(249, 250, 251)
      doc.rect(margin, y - 3.5, contentWidth, 6.5, 'F')
    }

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    doc.text(emp.name, colX[0] + 2, y)

    // Department with color indicator
    const deptColor = hexToRgb(getColor(emp.department))
    doc.setFillColor(deptColor[0], deptColor[1], deptColor[2])
    doc.circle(colX[1] + 3.5, y - 1.2, 1.2, 'F')
    doc.text(emp.department, colX[1] + 6.5, y)

    doc.setTextColor(100, 100, 100)
    doc.text(deskLabel, colX[2] + 2, y)
    doc.text(zoneLabel, colX[3] + 2, y)

    y += 6.5
  }

  doc.save('seating-arrangement.pdf')
}
