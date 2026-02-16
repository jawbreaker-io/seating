import { describe, it, expect, beforeEach } from 'vitest'
import {
  encodeSeating,
  decodeSeating,
  encodeSharePayload,
  decodeSharePayload,
  buildShareUrl,
  getSharedData,
  validateSeating,
} from '../shareUtils'
import type { SharePayload } from '../shareUtils'
import { defaultSeating, desks, zones, employees } from '../data'
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
