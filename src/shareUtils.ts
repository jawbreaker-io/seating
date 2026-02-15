import type { Desk, Zone, SeatingMap, DeskNameMap, UnavailableDeskMap } from './types'
import { desks as defaultDesks, employees, generateDesks } from './data'

const validEmployeeIds = new Set(employees.map((e) => e.id))

/** Data included in a shareable link. */
export interface SharePayload {
  zones: Zone[]
  seating: SeatingMap
  deskNames: DeskNameMap
  unavailableDesks: UnavailableDeskMap
}

/**
 * Validate a SeatingMap, stripping any entries with unknown desk or employee IDs.
 * Returns a clean SeatingMap with all known desks present (null for empty).
 */
export function validateSeating(
  raw: Record<string, unknown>,
  desks: Desk[] = defaultDesks,
): SeatingMap {
  const validDeskIds = new Set(desks.map((d) => d.id))
  const seating: SeatingMap = {}
  for (const desk of desks) {
    seating[desk.id] = null
  }
  for (const [deskId, empId] of Object.entries(raw)) {
    if (
      validDeskIds.has(deskId) &&
      typeof empId === 'string' &&
      validEmployeeIds.has(empId)
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
 * Encode a full share payload (zones + seating + desk names + unavailable desks)
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
      const seating = validateSeating(parsed.s ?? {}, generatedDesks)
      const deskNames: DeskNameMap = parsed.n ?? {}
      const unavailableDesks: UnavailableDeskMap = parsed.u ?? {}
      return { zones, seating, deskNames, unavailableDesks }
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

/** Export the seating arrangement as a downloadable JSON file. */
export function exportSeatingJson(seating: SeatingMap) {
  const data = JSON.stringify(seating, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'seating-arrangement.json'
  a.click()
  URL.revokeObjectURL(url)
}

/** Import a seating arrangement from a JSON file. Returns a promise with the SeatingMap. */
export function importSeatingJson(
  desks: Desk[] = defaultDesks,
): Promise<SeatingMap> {
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
          resolve(validateSeating(parsed as Record<string, unknown>, desks))
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
