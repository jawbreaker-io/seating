import type { SeatingMap } from './types'
import { desks, employees } from './data'

const validDeskIds = new Set(desks.map((d) => d.id))
const validEmployeeIds = new Set(employees.map((e) => e.id))

/**
 * Validate a SeatingMap, stripping any entries with unknown desk or employee IDs.
 * Returns a clean SeatingMap with all known desks present (null for empty).
 */
export function validateSeating(raw: Record<string, unknown>): SeatingMap {
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
export function decodeSeating(encoded: string): SeatingMap | null {
  try {
    if (!encoded) return validateSeating({})

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

    return validateSeating(raw)
  } catch {
    return null
  }
}

/** Build a shareable URL from the current arrangement. */
export function buildShareUrl(seating: SeatingMap): string {
  const encoded = encodeSeating(seating)
  const url = new URL(window.location.href)
  url.hash = `share=${encoded}`
  return url.toString()
}

/** Extract a shared arrangement from the current URL hash, if present. */
export function getSharedSeating(): SeatingMap | null {
  const hash = window.location.hash
  const match = hash.match(/^#share=(.+)$/)
  if (!match) return null
  return decodeSeating(match[1])
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
export function importSeatingJson(): Promise<SeatingMap> {
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
          resolve(validateSeating(parsed as Record<string, unknown>))
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
