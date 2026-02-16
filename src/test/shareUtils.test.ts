import { describe, it, expect, beforeEach } from 'vitest'
import {
  encodeSeating,
  decodeSeating,
  encodeSharePayload,
  decodeSharePayload,
  buildShareUrl,
  getSharedData,
  validateSeating,
  parseJsonConfig,
} from '../shareUtils'
import type { SharePayload } from '../shareUtils'
import { defaultSeating, desks, zones, employees, DEFAULT_DEPARTMENT_COLORS } from '../data'
import type { SeatingMap } from '../types'

describe('encodeSeating / decodeSeating', () => {
  it('round-trips the default seating map', () => {
    const encoded = encodeSeating(defaultSeating)
    const decoded = decodeSeating(encoded)
    expect(decoded).not.toBeNull()

    // Check all non-null assignments match
    for (const [deskId, empId] of Object.entries(defaultSeating)) {
      if (empId) {
        expect(decoded![deskId]).toBe(empId)
      }
    }
  })

  it('round-trips an empty seating map', () => {
    const empty: SeatingMap = {}
    for (const desk of desks) {
      empty[desk.id] = null
    }
    const encoded = encodeSeating(empty)
    const decoded = decodeSeating(encoded)
    expect(decoded).not.toBeNull()

    // All desks should be null
    for (const desk of desks) {
      expect(decoded![desk.id]).toBeNull()
    }
  })

  it('round-trips a partial seating map', () => {
    const partial: SeatingMap = { 'z1-d0': 'e5', 'z2-d1': 'e10' }
    const encoded = encodeSeating(partial)
    const decoded = decodeSeating(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!['z1-d0']).toBe('e5')
    expect(decoded!['z2-d1']).toBe('e10')
  })

  it('returns null for invalid encoded string', () => {
    expect(decodeSeating('!!!invalid!!!')).toBeNull()
  })

  it('produces a URL-safe string (no +, /, or =)', () => {
    const encoded = encodeSeating(defaultSeating)
    expect(encoded).not.toMatch(/[+/=]/)
  })
})

describe('encodeSharePayload / decodeSharePayload', () => {
  it('round-trips a full payload with zones, seating, desk names, and unavailable desks', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: { 'z1-d0': 'Corner Desk' },
      unavailableDesks: { 'z2-d1': true },
    }
    const encoded = encodeSharePayload(payload)
    const decoded = decodeSharePayload(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.zones).toEqual(zones)
    expect(decoded!.seating['z1-d0']).toBe('e1')
    expect(decoded!.deskNames).toEqual({ 'z1-d0': 'Corner Desk' })
    expect(decoded!.unavailableDesks).toEqual({ 'z2-d1': true })
  })

  it('round-trips a payload without optional desk names or unavailable desks', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: {},
      unavailableDesks: {},
    }
    const encoded = encodeSharePayload(payload)
    const decoded = decodeSharePayload(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.zones).toEqual(zones)
    expect(decoded!.deskNames).toEqual({})
    expect(decoded!.unavailableDesks).toEqual({})
  })

  it('produces a URL-safe string', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: {},
      unavailableDesks: {},
    }
    const encoded = encodeSharePayload(payload)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('returns null for invalid encoded string', () => {
    expect(decodeSharePayload('!!!invalid!!!')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeSharePayload('')).toBeNull()
  })

  it('falls back to legacy format for old seating-only links', () => {
    const legacyEncoded = encodeSeating(defaultSeating)
    const decoded = decodeSharePayload(legacyEncoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.zones).toEqual([])
    expect(decoded!.seating['z1-d0']).toBe('e1')
    expect(decoded!.deskNames).toEqual({})
    expect(decoded!.unavailableDesks).toEqual({})
  })
})

describe('buildShareUrl', () => {
  it('produces a URL with a #share= hash containing zone data', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: {},
      unavailableDesks: {},
    }
    const url = buildShareUrl(payload)
    expect(url).toContain('#share=')
    // The encoded part should not be empty
    const hash = url.split('#share=')[1]
    expect(hash.length).toBeGreaterThan(0)
  })
})

describe('getSharedData', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('returns null when no hash is present', () => {
    expect(getSharedData()).toBeNull()
  })

  it('returns null for a non-share hash', () => {
    window.location.hash = '#other=foo'
    expect(getSharedData()).toBeNull()
  })

  it('decodes a valid share hash with full payload', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: { 'z1-d0': 'My Desk' },
      unavailableDesks: {},
    }
    const encoded = encodeSharePayload(payload)
    window.location.hash = `#share=${encoded}`
    const result = getSharedData()
    expect(result).not.toBeNull()
    expect(result!.zones).toEqual(zones)
    expect(result!.seating['z1-d0']).toBe('e1')
    expect(result!.deskNames).toEqual({ 'z1-d0': 'My Desk' })
  })

  it('decodes a legacy seating-only share hash', () => {
    const legacyEncoded = encodeSeating(defaultSeating)
    window.location.hash = `#share=${legacyEncoded}`
    const result = getSharedData()
    expect(result).not.toBeNull()
    expect(result!.zones).toEqual([])
    expect(result!.seating['z1-d0']).toBe('e1')
  })
})

describe('validateSeating', () => {
  it('strips unknown desk IDs', () => {
    const result = validateSeating({ 'z1-d0': 'e1', 'fake-desk': 'e2' })
    expect(result['z1-d0']).toBe('e1')
    expect(result).not.toHaveProperty('fake-desk')
  })

  it('strips unknown employee IDs', () => {
    const result = validateSeating({ 'z1-d0': 'e1', 'z1-d1': 'fake-emp' }, desks, employees)
    expect(result['z1-d0']).toBe('e1')
    expect(result['z1-d1']).toBeNull()
  })

  it('strips non-string values', () => {
    const result = validateSeating({ 'z1-d0': 123, 'z1-d1': true, 'z1-d2': null })
    expect(result['z1-d0']).toBeNull()
    expect(result['z1-d1']).toBeNull()
    expect(result['z1-d2']).toBeNull()
  })

  it('returns all desks with null for empty input', () => {
    const result = validateSeating({})
    for (const desk of desks) {
      expect(result[desk.id]).toBeNull()
    }
    expect(Object.keys(result)).toHaveLength(desks.length)
  })

  it('preserves valid assignments', () => {
    const result = validateSeating(defaultSeating)
    for (const [deskId, empId] of Object.entries(defaultSeating)) {
      if (empId) {
        expect(result[deskId]).toBe(empId)
      }
    }
  })
})

describe('parseJsonConfig', () => {
  it('parses a full payload with all fields', () => {
    const input = {
      zones,
      seating: defaultSeating,
      deskNames: { 'z1-d0': 'Corner Desk' },
      unavailableDesks: { 'z2-d1': true },
      pinnedDesks: { 'z1-d0': true },
      employees,
      departmentColors: DEFAULT_DEPARTMENT_COLORS,
    }
    const result = parseJsonConfig(input as Record<string, unknown>)
    expect(result.zones).toEqual(zones)
    expect(result.seating['z1-d0']).toBe('e1')
    expect(result.deskNames).toEqual({ 'z1-d0': 'Corner Desk' })
    expect(result.unavailableDesks).toEqual({ 'z2-d1': true })
    expect(result.pinnedDesks).toEqual({ 'z1-d0': true })
    expect(result.employees).toEqual(employees)
    expect(result.departmentColors).toEqual(DEFAULT_DEPARTMENT_COLORS)
  })

  it('parses a payload with only zones and seating', () => {
    const input = {
      zones,
      seating: { 'z1-d0': 'e1' },
    }
    const result = parseJsonConfig(input as Record<string, unknown>)
    expect(result.zones).toEqual(zones)
    expect(result.seating['z1-d0']).toBe('e1')
    expect(result.deskNames).toEqual({})
    expect(result.unavailableDesks).toEqual({})
    expect(result.pinnedDesks).toEqual({})
    expect(result.employees).toBeUndefined()
    expect(result.departmentColors).toBeUndefined()
  })

  it('falls back to legacy SeatingMap-only format', () => {
    const input = { 'z1-d0': 'e1', 'z2-d0': 'e3' }
    const result = parseJsonConfig(input as Record<string, unknown>)
    expect(result.zones).toEqual([])
    expect(result.seating['z1-d0']).toBe('e1')
    expect(result.seating['z2-d0']).toBe('e3')
    expect(result.deskNames).toEqual({})
    expect(result.unavailableDesks).toEqual({})
  })

  it('generates desks from custom zones', () => {
    const customZones = [{ id: 'z1', name: 'Test', color: '#fff', rows: 1, cols: 2 }]
    const input = {
      zones: customZones,
      seating: { 'z1-d0': 'e1', 'z1-d1': 'e2' },
    }
    const result = parseJsonConfig(input as Record<string, unknown>)
    expect(result.zones).toEqual(customZones)
    expect(result.seating['z1-d0']).toBe('e1')
    expect(result.seating['z1-d1']).toBe('e2')
    // Only 2 desks should exist
    expect(Object.keys(result.seating)).toHaveLength(2)
  })

  it('strips unknown desk IDs from seating in full payload format', () => {
    const input = {
      zones,
      seating: { 'z1-d0': 'e1', 'fake-desk': 'e2' },
    }
    const result = parseJsonConfig(input as Record<string, unknown>)
    expect(result.seating['z1-d0']).toBe('e1')
    expect(result.seating).not.toHaveProperty('fake-desk')
  })

  it('validates employee IDs when employees are provided', () => {
    const customEmployees = [{ id: 'e1', name: 'Alice', department: 'Eng', avatar: 'AC' }]
    const input = {
      zones,
      seating: { 'z1-d0': 'e1', 'z1-d1': 'e999' },
      employees: customEmployees,
    }
    const result = parseJsonConfig(input as Record<string, unknown>)
    expect(result.seating['z1-d0']).toBe('e1')
    expect(result.seating['z1-d1']).toBeNull()
  })
})

describe('JSON config export/import round-trip', () => {
  it('round-trips a full config through JSON.stringify/parse (simulating file export/import)', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: { 'z1-d0': 'Corner Desk', 'z2-d0': 'Window Seat' },
      unavailableDesks: { 'z3-d7': true },
      pinnedDesks: { 'z1-d0': true, 'z1-d1': true },
      employees,
      departmentColors: DEFAULT_DEPARTMENT_COLORS,
    }

    // Simulate export: JSON.stringify
    const exported = JSON.stringify(payload, null, 2)

    // Simulate import: JSON.parse -> parseJsonConfig
    const parsed = JSON.parse(exported)
    const imported = parseJsonConfig(parsed)

    expect(imported.zones).toEqual(payload.zones)
    expect(imported.deskNames).toEqual(payload.deskNames)
    expect(imported.unavailableDesks).toEqual(payload.unavailableDesks)
    expect(imported.pinnedDesks).toEqual(payload.pinnedDesks)
    expect(imported.employees).toEqual(payload.employees)
    expect(imported.departmentColors).toEqual(payload.departmentColors)

    // Verify seating assignments
    for (const [deskId, empId] of Object.entries(payload.seating)) {
      if (empId) {
        expect(imported.seating[deskId]).toBe(empId)
      }
    }
  })

  it('round-trips a config with custom zones and employees', () => {
    const customZones = [
      { id: 'z1', name: 'Alpha', color: '#ff0000', rows: 2, cols: 3 },
      { id: 'z2', name: 'Beta', color: '#00ff00', rows: 1, cols: 2 },
    ]
    const customEmployees = [
      { id: 'e1', name: 'Alice', department: 'Eng', avatar: 'AC' },
      { id: 'e2', name: 'Bob', department: 'Design', avatar: 'BM' },
    ]
    const customColors = { Eng: '#123456', Design: '#654321' }
    const payload: SharePayload = {
      zones: customZones,
      seating: { 'z1-d0': 'e1', 'z2-d0': 'e2' },
      deskNames: { 'z1-d0': 'Alice Desk' },
      unavailableDesks: { 'z1-d5': true },
      pinnedDesks: { 'z1-d0': true },
      employees: customEmployees,
      departmentColors: customColors,
    }

    const exported = JSON.stringify(payload, null, 2)
    const imported = parseJsonConfig(JSON.parse(exported))

    expect(imported.zones).toEqual(customZones)
    expect(imported.employees).toEqual(customEmployees)
    expect(imported.departmentColors).toEqual(customColors)
    expect(imported.seating['z1-d0']).toBe('e1')
    expect(imported.seating['z2-d0']).toBe('e2')
    expect(imported.deskNames).toEqual({ 'z1-d0': 'Alice Desk' })
    expect(imported.unavailableDesks).toEqual({ 'z1-d5': true })
    expect(imported.pinnedDesks).toEqual({ 'z1-d0': true })
  })

  it('round-trips an empty config', () => {
    const payload: SharePayload = {
      zones: [],
      seating: {},
      deskNames: {},
      unavailableDesks: {},
      pinnedDesks: {},
      employees: [],
      departmentColors: {},
    }

    const exported = JSON.stringify(payload, null, 2)
    const imported = parseJsonConfig(JSON.parse(exported))

    expect(imported.zones).toEqual([])
    // With no zones, validateSeating falls back to default desks, all null
    for (const val of Object.values(imported.seating)) {
      expect(val).toBeNull()
    }
    expect(imported.deskNames).toEqual({})
    expect(imported.unavailableDesks).toEqual({})
    expect(imported.pinnedDesks).toEqual({})
    expect(imported.employees).toEqual([])
    expect(imported.departmentColors).toEqual({})
  })

  it('handles importing a legacy SeatingMap-only JSON file', () => {
    // Old format: just { "deskId": "empId" }
    const legacyExport = { 'z1-d0': 'e1', 'z2-d0': 'e3', 'z3-d0': 'e5' }
    const imported = parseJsonConfig(legacyExport as Record<string, unknown>)

    expect(imported.zones).toEqual([])
    expect(imported.seating['z1-d0']).toBe('e1')
    expect(imported.seating['z2-d0']).toBe('e3')
    expect(imported.seating['z3-d0']).toBe('e5')
    expect(imported.deskNames).toEqual({})
    expect(imported.unavailableDesks).toEqual({})
  })
})

describe('Shareable link round-trip (comprehensive)', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('round-trips a full payload with employees, dept colors, and pinned desks via URL', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: { 'z1-d0': 'Corner Desk' },
      unavailableDesks: { 'z3-d7': true },
      pinnedDesks: { 'z1-d0': true, 'z1-d1': true },
      employees,
      departmentColors: DEFAULT_DEPARTMENT_COLORS,
    }

    const url = buildShareUrl(payload)
    const hashPart = url.split('#share=')[1]
    const decoded = decodeSharePayload(hashPart)

    expect(decoded).not.toBeNull()
    expect(decoded!.zones).toEqual(zones)
    expect(decoded!.deskNames).toEqual({ 'z1-d0': 'Corner Desk' })
    expect(decoded!.unavailableDesks).toEqual({ 'z3-d7': true })
    expect(decoded!.pinnedDesks).toEqual({ 'z1-d0': true, 'z1-d1': true })
    expect(decoded!.employees).toEqual(employees)
    expect(decoded!.departmentColors).toEqual(DEFAULT_DEPARTMENT_COLORS)

    // Verify seating
    for (const [deskId, empId] of Object.entries(defaultSeating)) {
      if (empId) {
        expect(decoded!.seating[deskId]).toBe(empId)
      }
    }
  })

  it('round-trips via getSharedData with employees and dept colors', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: { 'z1-d0': 'My Desk' },
      unavailableDesks: { 'z1-d5': true },
      pinnedDesks: { 'z1-d0': true },
      employees,
      departmentColors: DEFAULT_DEPARTMENT_COLORS,
    }

    const encoded = encodeSharePayload(payload)
    window.location.hash = `#share=${encoded}`

    const result = getSharedData()
    expect(result).not.toBeNull()
    expect(result!.zones).toEqual(zones)
    expect(result!.employees).toEqual(employees)
    expect(result!.departmentColors).toEqual(DEFAULT_DEPARTMENT_COLORS)
    expect(result!.pinnedDesks).toEqual({ 'z1-d0': true })
    expect(result!.deskNames).toEqual({ 'z1-d0': 'My Desk' })
    expect(result!.unavailableDesks).toEqual({ 'z1-d5': true })
  })

  it('round-trips custom zones and custom employees via shareable link', () => {
    const customZones = [
      { id: 'z1', name: 'Room A', color: '#aabbcc', rows: 1, cols: 3 },
    ]
    const customEmployees = [
      { id: 'e1', name: 'Zara', department: 'Research', avatar: 'ZA' },
      { id: 'e2', name: 'Yuki', department: 'Research', avatar: 'YU' },
    ]
    const customColors = { Research: '#abcdef' }
    const payload: SharePayload = {
      zones: customZones,
      seating: { 'z1-d0': 'e1', 'z1-d1': 'e2' },
      deskNames: { 'z1-d0': 'Zara Spot' },
      unavailableDesks: { 'z1-d2': true },
      pinnedDesks: { 'z1-d0': true },
      employees: customEmployees,
      departmentColors: customColors,
    }

    const encoded = encodeSharePayload(payload)
    const decoded = decodeSharePayload(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.zones).toEqual(customZones)
    expect(decoded!.employees).toEqual(customEmployees)
    expect(decoded!.departmentColors).toEqual(customColors)
    expect(decoded!.seating['z1-d0']).toBe('e1')
    expect(decoded!.seating['z1-d1']).toBe('e2')
    expect(decoded!.deskNames).toEqual({ 'z1-d0': 'Zara Spot' })
    expect(decoded!.unavailableDesks).toEqual({ 'z1-d2': true })
    expect(decoded!.pinnedDesks).toEqual({ 'z1-d0': true })
  })

  it('handles payload with employees but no department colors', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: {},
      unavailableDesks: {},
      employees,
    }

    const encoded = encodeSharePayload(payload)
    const decoded = decodeSharePayload(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.employees).toEqual(employees)
    expect(decoded!.departmentColors).toBeUndefined()
  })

  it('handles payload with pinned desks but no employees', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: {},
      unavailableDesks: {},
      pinnedDesks: { 'z1-d0': true, 'z1-d2': true },
    }

    const encoded = encodeSharePayload(payload)
    const decoded = decodeSharePayload(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.pinnedDesks).toEqual({ 'z1-d0': true, 'z1-d2': true })
    expect(decoded!.employees).toBeUndefined()
  })

  it('shareable link data matches JSON config data for same payload', () => {
    const payload: SharePayload = {
      zones,
      seating: defaultSeating,
      deskNames: { 'z1-d0': 'Special' },
      unavailableDesks: { 'z2-d2': true },
      pinnedDesks: { 'z1-d0': true },
      employees,
      departmentColors: DEFAULT_DEPARTMENT_COLORS,
    }

    // Via shareable link
    const encoded = encodeSharePayload(payload)
    const fromLink = decodeSharePayload(encoded)

    // Via JSON export/import
    const jsonStr = JSON.stringify(payload, null, 2)
    const fromJson = parseJsonConfig(JSON.parse(jsonStr))

    expect(fromLink).not.toBeNull()
    expect(fromLink!.zones).toEqual(fromJson.zones)
    expect(fromLink!.deskNames).toEqual(fromJson.deskNames)
    expect(fromLink!.unavailableDesks).toEqual(fromJson.unavailableDesks)
    expect(fromLink!.pinnedDesks).toEqual(fromJson.pinnedDesks)
    expect(fromLink!.employees).toEqual(fromJson.employees)
    expect(fromLink!.departmentColors).toEqual(fromJson.departmentColors)

    // Verify seating matches
    for (const deskId of Object.keys(fromLink!.seating)) {
      expect(fromLink!.seating[deskId]).toBe(fromJson.seating[deskId])
    }
  })
})
