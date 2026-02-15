import { describe, it, expect, beforeEach } from 'vitest'
import { encodeSeating, decodeSeating, buildShareUrl, getSharedSeating } from '../shareUtils'
import { defaultSeating, desks } from '../data'
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

describe('buildShareUrl', () => {
  it('produces a URL with a #share= hash', () => {
    const url = buildShareUrl(defaultSeating)
    expect(url).toContain('#share=')
  })
})

describe('getSharedSeating', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('returns null when no hash is present', () => {
    expect(getSharedSeating()).toBeNull()
  })

  it('returns null for a non-share hash', () => {
    window.location.hash = '#other=foo'
    expect(getSharedSeating()).toBeNull()
  })

  it('decodes a valid share hash', () => {
    const encoded = encodeSeating(defaultSeating)
    window.location.hash = `#share=${encoded}`
    const result = getSharedSeating()
    expect(result).not.toBeNull()
    expect(result!['z1-d0']).toBe('e1')
  })
})
