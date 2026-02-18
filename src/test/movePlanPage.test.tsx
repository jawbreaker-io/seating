import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MovePlanPage } from '../components/MovePlanPage'
import { decodeSharePayload, encodeSharePayload } from '../shareUtils'
import type { MovePlanPayload } from '../shareUtils'
import type { Employee, Zone, SeatingMap, DeskNameMap } from '../types'
import { generateDesks } from '../data'

// --- Test fixtures ---

const testZones: Zone[] = [
  { id: 'z1', name: 'Engineering Bay', color: '#dbeafe', rows: 2, cols: 3 },
  { id: 'z2', name: 'Design Studio', color: '#f3e8ff', rows: 1, cols: 2 },
]

const testEmployees: Employee[] = [
  { id: 'e1', name: 'Alice Chen', department: 'Engineering', avatar: 'AC' },
  { id: 'e2', name: 'Bob Martinez', department: 'Engineering', avatar: 'BM' },
  { id: 'e3', name: 'Carol Wu', department: 'Design', avatar: 'CW' },
  { id: 'e4', name: 'David Kim', department: 'Marketing', avatar: 'DK' },
]

const testDeskNames: DeskNameMap = {}

const testDeptColors: Record<string, string> = {
  Engineering: '#3b82f6',
  Design: '#a855f7',
  Marketing: '#f97316',
}

function makePayload(overrides: Partial<MovePlanPayload> = {}): MovePlanPayload {
  const desks = generateDesks(testZones)
  const baseOriginal: SeatingMap = {}
  const baseNew: SeatingMap = {}
  for (const d of desks) {
    baseOriginal[d.id] = null
    baseNew[d.id] = null
  }
  // Default: Alice at z1-d0 originally, moves to z1-d1
  baseOriginal['z1-d0'] = 'e1'
  baseNew['z1-d1'] = 'e1'

  return {
    originalSeating: baseOriginal,
    newSeating: baseNew,
    employees: testEmployees,
    zones: testZones,
    deskNames: testDeskNames,
    departmentColors: testDeptColors,
    ...overrides,
  }
}

/** Extract the share payload encoded in a link's hash. */
function decodeHrefPayload(href: string) {
  const hashPart = href.split('#share=')[1]
  expect(hashPart).toBeDefined()
  const desks = generateDesks(testZones)
  return decodeSharePayload(hashPart, desks)
}

// --- Tests ---

describe('MovePlanPage', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  describe('layout link rendering', () => {
    it('renders both "View Original Layout" and "View New Layout" links', () => {
      render(<MovePlanPage payload={makePayload()} />)

      const originalLink = screen.getByTestId('view-original-layout-link')
      const newLink = screen.getByTestId('view-new-layout-link')

      expect(originalLink).toBeInTheDocument()
      expect(newLink).toBeInTheDocument()
      expect(originalLink).toHaveTextContent('View Original Layout')
      expect(newLink).toHaveTextContent('View New Layout')
    })

    it('renders links as anchor elements', () => {
      render(<MovePlanPage payload={makePayload()} />)

      const originalLink = screen.getByTestId('view-original-layout-link')
      const newLink = screen.getByTestId('view-new-layout-link')

      expect(originalLink.tagName).toBe('A')
      expect(newLink.tagName).toBe('A')
    })

    it('opens links in a new tab', () => {
      render(<MovePlanPage payload={makePayload()} />)

      const originalLink = screen.getByTestId('view-original-layout-link')
      const newLink = screen.getByTestId('view-new-layout-link')

      expect(originalLink).toHaveAttribute('target', '_blank')
      expect(newLink).toHaveAttribute('target', '_blank')
    })

    it('sets rel="noopener noreferrer" on links for security', () => {
      render(<MovePlanPage payload={makePayload()} />)

      const originalLink = screen.getByTestId('view-original-layout-link')
      const newLink = screen.getByTestId('view-new-layout-link')

      expect(originalLink).toHaveAttribute('rel', 'noopener noreferrer')
      expect(newLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('links have href attributes containing #share= hash', () => {
      render(<MovePlanPage payload={makePayload()} />)

      const originalLink = screen.getByTestId('view-original-layout-link')
      const newLink = screen.getByTestId('view-new-layout-link')

      expect(originalLink.getAttribute('href')).toContain('#share=')
      expect(newLink.getAttribute('href')).toContain('#share=')
    })

    it('renders links even when layouts are identical (no moves)', () => {
      const desks = generateDesks(testZones)
      const seating: SeatingMap = {}
      for (const d of desks) seating[d.id] = null
      seating['z1-d0'] = 'e1'

      const payload = makePayload({
        originalSeating: { ...seating },
        newSeating: { ...seating },
      })

      render(<MovePlanPage payload={payload} />)

      expect(screen.getByTestId('view-original-layout-link')).toBeInTheDocument()
      expect(screen.getByTestId('view-new-layout-link')).toBeInTheDocument()
    })

    it('renders links when both seatings are completely empty', () => {
      const desks = generateDesks(testZones)
      const emptySeating: SeatingMap = {}
      for (const d of desks) emptySeating[d.id] = null

      const payload = makePayload({
        originalSeating: { ...emptySeating },
        newSeating: { ...emptySeating },
      })

      render(<MovePlanPage payload={payload} />)

      expect(screen.getByTestId('view-original-layout-link')).toBeInTheDocument()
      expect(screen.getByTestId('view-new-layout-link')).toBeInTheDocument()
    })
  })

  describe('layout link URLs encode correct seating data', () => {
    it('original layout link encodes original seating assignments', () => {
      const payload = makePayload()
      render(<MovePlanPage payload={payload} />)

      const link = screen.getByTestId('view-original-layout-link')
      const decoded = decodeHrefPayload(link.getAttribute('href')!)

      expect(decoded).not.toBeNull()
      expect(decoded!.seating['z1-d0']).toBe('e1')
      // z1-d1 should be empty in original
      expect(decoded!.seating['z1-d1']).toBeNull()
    })

    it('new layout link encodes new seating assignments', () => {
      const payload = makePayload()
      render(<MovePlanPage payload={payload} />)

      const link = screen.getByTestId('view-new-layout-link')
      const decoded = decodeHrefPayload(link.getAttribute('href')!)

      expect(decoded).not.toBeNull()
      // z1-d0 should be empty in new
      expect(decoded!.seating['z1-d0']).toBeNull()
      expect(decoded!.seating['z1-d1']).toBe('e1')
    })

    it('original and new layout links have different hrefs when seatings differ', () => {
      render(<MovePlanPage payload={makePayload()} />)

      const originalHref = screen.getByTestId('view-original-layout-link').getAttribute('href')
      const newHref = screen.getByTestId('view-new-layout-link').getAttribute('href')

      expect(originalHref).not.toBe(newHref)
    })

    it('original and new layout links have identical hrefs when seatings are the same', () => {
      const desks = generateDesks(testZones)
      const seating: SeatingMap = {}
      for (const d of desks) seating[d.id] = null
      seating['z1-d0'] = 'e1'

      const payload = makePayload({
        originalSeating: { ...seating },
        newSeating: { ...seating },
      })

      render(<MovePlanPage payload={payload} />)

      const originalHref = screen.getByTestId('view-original-layout-link').getAttribute('href')
      const newHref = screen.getByTestId('view-new-layout-link').getAttribute('href')

      expect(originalHref).toBe(newHref)
    })

    it('layout links encode zone information', () => {
      const payload = makePayload()
      render(<MovePlanPage payload={payload} />)

      const link = screen.getByTestId('view-original-layout-link')
      const decoded = decodeHrefPayload(link.getAttribute('href')!)

      expect(decoded).not.toBeNull()
      expect(decoded!.zones).toHaveLength(testZones.length)
      expect(decoded!.zones[0].name).toBe('Engineering Bay')
      expect(decoded!.zones[1].name).toBe('Design Studio')
    })

    it('layout links encode employee data', () => {
      const payload = makePayload()
      render(<MovePlanPage payload={payload} />)

      const link = screen.getByTestId('view-original-layout-link')
      const decoded = decodeHrefPayload(link.getAttribute('href')!)

      expect(decoded).not.toBeNull()
      expect(decoded!.employees).toBeDefined()
      expect(decoded!.employees).toHaveLength(testEmployees.length)
      expect(decoded!.employees!.map((e) => e.id).sort()).toEqual(
        testEmployees.map((e) => e.id).sort(),
      )
    })

    it('layout links encode department colors', () => {
      const payload = makePayload()
      render(<MovePlanPage payload={payload} />)

      const link = screen.getByTestId('view-original-layout-link')
      const decoded = decodeHrefPayload(link.getAttribute('href')!)

      expect(decoded).not.toBeNull()
      expect(decoded!.departmentColors).toBeDefined()
      expect(decoded!.departmentColors!['Engineering']).toBe('#3b82f6')
      expect(decoded!.departmentColors!['Design']).toBe('#a855f7')
    })

    it('layout links encode custom desk names', () => {
      const customNames: DeskNameMap = { 'z1-d0': 'Corner Desk', 'z2-d0': 'Window Seat' }
      const payload = makePayload({ deskNames: customNames })
      render(<MovePlanPage payload={payload} />)

      const link = screen.getByTestId('view-original-layout-link')
      const decoded = decodeHrefPayload(link.getAttribute('href')!)

      expect(decoded).not.toBeNull()
      expect(decoded!.deskNames['z1-d0']).toBe('Corner Desk')
      expect(decoded!.deskNames['z2-d0']).toBe('Window Seat')
    })
  })

  describe('layout links with various move scenarios', () => {
    it('encodes correct data for a simple direct move', () => {
      // Alice moves from z1-d0 to z1-d2
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      original['z1-d0'] = 'e1'
      newS['z1-d2'] = 'e1'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )
      const newDecoded = decodeHrefPayload(
        screen.getByTestId('view-new-layout-link').getAttribute('href')!,
      )

      expect(origDecoded!.seating['z1-d0']).toBe('e1')
      expect(origDecoded!.seating['z1-d2']).toBeNull()
      expect(newDecoded!.seating['z1-d0']).toBeNull()
      expect(newDecoded!.seating['z1-d2']).toBe('e1')
    })

    it('encodes correct data for a two-person swap', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      // Swap: Alice z1-d0 <-> Bob z1-d1
      original['z1-d0'] = 'e1'
      original['z1-d1'] = 'e2'
      newS['z1-d0'] = 'e2'
      newS['z1-d1'] = 'e1'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )
      const newDecoded = decodeHrefPayload(
        screen.getByTestId('view-new-layout-link').getAttribute('href')!,
      )

      expect(origDecoded!.seating['z1-d0']).toBe('e1')
      expect(origDecoded!.seating['z1-d1']).toBe('e2')
      expect(newDecoded!.seating['z1-d0']).toBe('e2')
      expect(newDecoded!.seating['z1-d1']).toBe('e1')
    })

    it('encodes correct data for removals (employee leaves)', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      original['z1-d0'] = 'e1'
      // e1 is unassigned in new

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )
      const newDecoded = decodeHrefPayload(
        screen.getByTestId('view-new-layout-link').getAttribute('href')!,
      )

      expect(origDecoded!.seating['z1-d0']).toBe('e1')
      expect(newDecoded!.seating['z1-d0']).toBeNull()
    })

    it('encodes correct data for new assignments (employee joins)', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      // e1 is unassigned originally, assigned in new
      newS['z2-d0'] = 'e1'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )
      const newDecoded = decodeHrefPayload(
        screen.getByTestId('view-new-layout-link').getAttribute('href')!,
      )

      expect(origDecoded!.seating['z2-d0']).toBeNull()
      expect(newDecoded!.seating['z2-d0']).toBe('e1')
    })

    it('encodes correct data for a complex mixed scenario', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      // Alice stays at z1-d0 (unchanged)
      original['z1-d0'] = 'e1'
      newS['z1-d0'] = 'e1'
      // Bob moves from z1-d1 to z1-d3
      original['z1-d1'] = 'e2'
      newS['z1-d3'] = 'e2'
      // Carol is removed
      original['z2-d0'] = 'e3'
      // David is newly assigned
      newS['z2-d1'] = 'e4'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )
      const newDecoded = decodeHrefPayload(
        screen.getByTestId('view-new-layout-link').getAttribute('href')!,
      )

      // Unchanged: Alice at z1-d0
      expect(origDecoded!.seating['z1-d0']).toBe('e1')
      expect(newDecoded!.seating['z1-d0']).toBe('e1')
      // Move: Bob
      expect(origDecoded!.seating['z1-d1']).toBe('e2')
      expect(origDecoded!.seating['z1-d3']).toBeNull()
      expect(newDecoded!.seating['z1-d1']).toBeNull()
      expect(newDecoded!.seating['z1-d3']).toBe('e2')
      // Removal: Carol
      expect(origDecoded!.seating['z2-d0']).toBe('e3')
      expect(newDecoded!.seating['z2-d0']).toBeNull()
      // Addition: David
      expect(origDecoded!.seating['z2-d1']).toBeNull()
      expect(newDecoded!.seating['z2-d1']).toBe('e4')
    })
  })

  describe('layout links are valid decodable share URLs', () => {
    it('original layout URL can be fully round-tripped through encode/decode', () => {
      const payload = makePayload()
      render(<MovePlanPage payload={payload} />)

      const href = screen.getByTestId('view-original-layout-link').getAttribute('href')!
      const hashPart = href.split('#share=')[1]
      const desks = generateDesks(testZones)
      const decoded = decodeSharePayload(hashPart, desks)

      expect(decoded).not.toBeNull()
      // Re-encode and verify it produces a valid payload
      const reEncoded = encodeSharePayload(decoded!)
      const reDecoded = decodeSharePayload(reEncoded, desks)
      expect(reDecoded).not.toBeNull()
      expect(reDecoded!.seating['z1-d0']).toBe('e1')
    })

    it('new layout URL can be fully round-tripped through encode/decode', () => {
      const payload = makePayload()
      render(<MovePlanPage payload={payload} />)

      const href = screen.getByTestId('view-new-layout-link').getAttribute('href')!
      const hashPart = href.split('#share=')[1]
      const desks = generateDesks(testZones)
      const decoded = decodeSharePayload(hashPart, desks)

      expect(decoded).not.toBeNull()
      const reEncoded = encodeSharePayload(decoded!)
      const reDecoded = decodeSharePayload(reEncoded, desks)
      expect(reDecoded).not.toBeNull()
      expect(reDecoded!.seating['z1-d1']).toBe('e1')
    })
  })

  describe('move plan page content rendering', () => {
    it('renders the page title', () => {
      render(<MovePlanPage payload={makePayload()} />)
      expect(screen.getByText('Desk Move Plan')).toBeInTheDocument()
    })

    it('renders the description text', () => {
      render(<MovePlanPage payload={makePayload()} />)
      expect(
        screen.getByText(/Follow the steps below in order to complete the office rearrangement/),
      ).toBeInTheDocument()
    })

    it('shows summary statistics', () => {
      render(<MovePlanPage payload={makePayload()} />)
      expect(screen.getByText('Total Steps')).toBeInTheDocument()
      expect(screen.getByText('Desk Changes')).toBeInTheDocument()
      expect(screen.getByText('Swap Cycles')).toBeInTheDocument()
      expect(screen.getByText('Unchanged')).toBeInTheDocument()
    })

    it('displays move steps for a simple move', () => {
      render(<MovePlanPage payload={makePayload()} />)
      // Alice should appear in the move steps
      expect(screen.getByText('Alice Chen')).toBeInTheDocument()
    })

    it('shows "Layouts are identical" when no moves needed', () => {
      const desks = generateDesks(testZones)
      const seating: SeatingMap = {}
      for (const d of desks) seating[d.id] = null
      seating['z1-d0'] = 'e1'

      const payload = makePayload({
        originalSeating: { ...seating },
        newSeating: { ...seating },
      })

      render(<MovePlanPage payload={payload} />)
      expect(screen.getByText('Layouts are identical!')).toBeInTheDocument()
      expect(screen.getByText('No moves are needed.')).toBeInTheDocument()
    })

    it('shows swap cycle warning when cycles are detected', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      original['z1-d0'] = 'e1'
      original['z1-d1'] = 'e2'
      newS['z1-d0'] = 'e2'
      newS['z1-d1'] = 'e1'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      expect(screen.getByText(/swap cycle.*detected/i)).toBeInTheDocument()
    })

    it('displays employee avatars', () => {
      render(<MovePlanPage payload={makePayload()} />)
      expect(screen.getByText('AC')).toBeInTheDocument()
    })

    it('shows employee department', () => {
      render(<MovePlanPage payload={makePayload()} />)
      expect(screen.getByText('Engineering')).toBeInTheDocument()
    })

    it('shows correct step count in summary', () => {
      // Simple move: 1 removal + 1 addition = or just 1 move depending on algorithm
      render(<MovePlanPage payload={makePayload()} />)
      const totalStepsEl = screen.getByText('Total Steps')
      const valueEl = totalStepsEl.previousElementSibling
      expect(valueEl).toBeDefined()
      // At least 1 step
      expect(Number(valueEl!.textContent)).toBeGreaterThanOrEqual(1)
    })

    it('renders multiple move steps for multi-person rearrangement', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      original['z1-d0'] = 'e1'
      original['z1-d1'] = 'e2'
      original['z1-d2'] = 'e3'
      newS['z1-d3'] = 'e1'
      newS['z1-d4'] = 'e2'
      newS['z1-d5'] = 'e3'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      expect(screen.getByText('Alice Chen')).toBeInTheDocument()
      expect(screen.getByText('Bob Martinez')).toBeInTheDocument()
      expect(screen.getByText('Carol Wu')).toBeInTheDocument()
    })
  })

  describe('layout links with edge cases', () => {
    it('handles single-zone layout', () => {
      const singleZone: Zone[] = [
        { id: 'z1', name: 'Only Zone', color: '#dbeafe', rows: 1, cols: 2 },
      ]
      const desks = generateDesks(singleZone)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      original['z1-d0'] = 'e1'
      newS['z1-d1'] = 'e1'

      const payload: MovePlanPayload = {
        originalSeating: original,
        newSeating: newS,
        employees: testEmployees,
        zones: singleZone,
        deskNames: {},
        departmentColors: testDeptColors,
      }

      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )

      expect(origDecoded).not.toBeNull()
      expect(origDecoded!.zones).toHaveLength(1)
      expect(origDecoded!.zones[0].name).toBe('Only Zone')
    })

    it('handles many employees with all desks occupied', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      // Fill first 4 desks with employees
      original['z1-d0'] = 'e1'
      original['z1-d1'] = 'e2'
      original['z1-d2'] = 'e3'
      original['z1-d3'] = 'e4'
      // Shift everyone one desk in new
      newS['z1-d1'] = 'e1'
      newS['z1-d2'] = 'e2'
      newS['z1-d3'] = 'e3'
      newS['z1-d4'] = 'e4'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )
      const newDecoded = decodeHrefPayload(
        screen.getByTestId('view-new-layout-link').getAttribute('href')!,
      )

      expect(origDecoded!.seating['z1-d0']).toBe('e1')
      expect(origDecoded!.seating['z1-d3']).toBe('e4')
      expect(newDecoded!.seating['z1-d1']).toBe('e1')
      expect(newDecoded!.seating['z1-d4']).toBe('e4')
    })

    it('handles empty desk names gracefully', () => {
      const payload = makePayload({ deskNames: {} })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )

      expect(origDecoded).not.toBeNull()
      expect(Object.keys(origDecoded!.deskNames)).toHaveLength(0)
    })

    it('handles empty department colors', () => {
      const payload = makePayload({ departmentColors: {} })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )

      expect(origDecoded).not.toBeNull()
    })

    it('handles cross-zone moves in link data', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      // Alice moves from zone 1 to zone 2
      original['z1-d0'] = 'e1'
      newS['z2-d0'] = 'e1'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      const origDecoded = decodeHrefPayload(
        screen.getByTestId('view-original-layout-link').getAttribute('href')!,
      )
      const newDecoded = decodeHrefPayload(
        screen.getByTestId('view-new-layout-link').getAttribute('href')!,
      )

      expect(origDecoded!.seating['z1-d0']).toBe('e1')
      expect(origDecoded!.seating['z2-d0']).toBeNull()
      expect(newDecoded!.seating['z1-d0']).toBeNull()
      expect(newDecoded!.seating['z2-d0']).toBe('e1')
    })
  })

  describe('section summary rendering', () => {
    it('shows Summary by Type when there are multiple section types', () => {
      const desks = generateDesks(testZones)
      const original: SeatingMap = {}
      const newS: SeatingMap = {}
      for (const d of desks) {
        original[d.id] = null
        newS[d.id] = null
      }
      // Direct move (Alice) + New assignment (Bob)
      original['z1-d0'] = 'e1'
      newS['z1-d1'] = 'e1'
      newS['z1-d2'] = 'e2'

      const payload = makePayload({ originalSeating: original, newSeating: newS })
      render(<MovePlanPage payload={payload} />)

      expect(screen.getByText('Summary by Type')).toBeInTheDocument()
    })

    it('does not show Summary by Type when only one section type exists', () => {
      // Simple single move - only one section type
      render(<MovePlanPage payload={makePayload()} />)

      expect(screen.queryByText('Summary by Type')).not.toBeInTheDocument()
    })
  })
})
