import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportSeatingPdf } from '../shareUtils'
import type { PdfExportData } from '../shareUtils'
import { employees, zones, desks, defaultSeating, DEFAULT_DEPARTMENT_COLORS } from '../data'
import type { Zone } from '../types'

// Mock jsPDF so we can verify the correct methods are called without generating real PDFs
const mockSave = vi.fn()
const mockText = vi.fn()
const mockAddPage = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockSetTextColor = vi.fn()
const mockSetFillColor = vi.fn()
const mockSetDrawColor = vi.fn()
const mockRect = vi.fn()
const mockRoundedRect = vi.fn()
const mockLine = vi.fn()
const mockCircle = vi.fn()

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.text = mockText
    this.save = mockSave
    this.addPage = mockAddPage
    this.setFontSize = mockSetFontSize
    this.setFont = mockSetFont
    this.setTextColor = mockSetTextColor
    this.setFillColor = mockSetFillColor
    this.setDrawColor = mockSetDrawColor
    this.rect = mockRect
    this.roundedRect = mockRoundedRect
    this.line = mockLine
    this.circle = mockCircle
  }),
}))

function buildData(overrides?: Partial<PdfExportData>): PdfExportData {
  return {
    seating: defaultSeating,
    zones,
    desks,
    deskNames: {},
    unavailableDesks: {},
    employees,
    departmentColors: DEFAULT_DEPARTMENT_COLORS,
    ...overrides,
  }
}

describe('exportSeatingPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves a PDF file with the expected filename', () => {
    exportSeatingPdf(buildData())
    expect(mockSave).toHaveBeenCalledWith('seating-arrangement.pdf')
  })

  it('renders the title', () => {
    exportSeatingPdf(buildData())
    expect(mockText).toHaveBeenCalledWith(
      'Office Seating Chart',
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('renders zone names', () => {
    exportSeatingPdf(buildData())
    for (const zone of zones) {
      expect(mockText).toHaveBeenCalledWith(
        zone.name,
        expect.any(Number),
        expect.any(Number),
      )
    }
  })

  it('renders the employee directory header', () => {
    exportSeatingPdf(buildData())
    expect(mockText).toHaveBeenCalledWith(
      'Employee Directory',
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('renders all employee names in the directory', () => {
    exportSeatingPdf(buildData())
    for (const emp of employees) {
      expect(mockText).toHaveBeenCalledWith(
        emp.name,
        expect.any(Number),
        expect.any(Number),
      )
    }
  })

  it('renders summary stats', () => {
    exportSeatingPdf(buildData())
    // defaultSeating has 16 entries assigned
    const assigned = Object.values(defaultSeating).filter(Boolean).length
    const unassigned = employees.length - assigned
    const statsCall = mockText.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('seated'),
    )
    expect(statsCall).toBeDefined()
    expect(statsCall![0]).toContain(`${assigned} seated`)
    expect(statsCall![0]).toContain(`${unassigned} unassigned`)
  })

  it('handles unavailable desks in stats', () => {
    const data = buildData({ unavailableDesks: { 'z1-d5': true, 'z1-d6': true } })
    exportSeatingPdf(data)
    const statsCall = mockText.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('unavailable'),
    )
    expect(statsCall).toBeDefined()
    expect(statsCall![0]).toContain('2 unavailable')
  })

  it('handles an empty seating arrangement', () => {
    const emptySeating: Record<string, null> = {}
    for (const desk of desks) {
      emptySeating[desk.id] = null
    }
    exportSeatingPdf(buildData({ seating: emptySeating }))
    expect(mockSave).toHaveBeenCalledWith('seating-arrangement.pdf')
  })

  it('handles empty zones', () => {
    const emptyZones: Zone[] = []
    exportSeatingPdf(buildData({ zones: emptyZones, desks: [] }))
    expect(mockSave).toHaveBeenCalledWith('seating-arrangement.pdf')
  })

  it('uses custom desk names when provided', () => {
    const deskNames = { 'z1-d0': 'Corner Desk' }
    exportSeatingPdf(buildData({ deskNames }))
    expect(mockText).toHaveBeenCalledWith(
      'Corner Desk',
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('renders all department names in the employee directory', () => {
    exportSeatingPdf(buildData())
    const departments = [...new Set(employees.map((e) => e.department))]
    for (const dept of departments) {
      expect(mockText).toHaveBeenCalledWith(
        dept,
        expect.any(Number),
        expect.any(Number),
      )
    }
  })

  it('renders department color indicators for each employee', () => {
    exportSeatingPdf(buildData())
    // Each employee gets a department color circle in the directory
    expect(mockCircle.mock.calls.length).toBe(employees.length)
  })

  it('renders N/A text for unavailable desks', () => {
    const data = buildData({ unavailableDesks: { 'z1-d5': true } })
    exportSeatingPdf(data)
    expect(mockText).toHaveBeenCalledWith(
      'N/A',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'center' }),
    )
  })

  it('renders zone backgrounds for each zone', () => {
    exportSeatingPdf(buildData())
    // Each zone gets a background rounded rect (plus desk cell rects)
    // At minimum, there should be 1 background rect per zone
    expect(mockRoundedRect.mock.calls.length).toBeGreaterThanOrEqual(zones.length)
  })

  it('renders desk cells for each desk', () => {
    exportSeatingPdf(buildData())
    // Each desk gets 2 roundedRect calls (fill + stroke)
    expect(mockRoundedRect.mock.calls.length).toBeGreaterThanOrEqual(desks.length * 2)
  })

  it('renders employee names on occupied desks in the floor plan', () => {
    const data = buildData()
    exportSeatingPdf(data)
    // Alice Chen is at z1-d0 in defaultSeating
    expect(mockText).toHaveBeenCalledWith(
      'Alice Chen',
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('uses custom department colors for color indicators', () => {
    const customColors = { Engineering: '#ff0000', Design: '#00ff00' }
    exportSeatingPdf(buildData({ departmentColors: { ...DEFAULT_DEPARTMENT_COLORS, ...customColors } }))
    // Should have called setFillColor with custom red for Engineering
    expect(mockSetFillColor).toHaveBeenCalledWith(255, 0, 0)
    // Should have called setFillColor with custom green for Design
    expect(mockSetFillColor).toHaveBeenCalledWith(0, 255, 0)
  })

  it('renders table headers in employee directory', () => {
    exportSeatingPdf(buildData())
    expect(mockText).toHaveBeenCalledWith('Employee', expect.any(Number), expect.any(Number))
    expect(mockText).toHaveBeenCalledWith('Department', expect.any(Number), expect.any(Number))
    expect(mockText).toHaveBeenCalledWith('Desk', expect.any(Number), expect.any(Number))
    expect(mockText).toHaveBeenCalledWith('Zone', expect.any(Number), expect.any(Number))
  })

  it('renders zone names in the employee directory for seated employees', () => {
    exportSeatingPdf(buildData())
    // Alice Chen is in Engineering Bay (z1)
    expect(mockText).toHaveBeenCalledWith(
      'Engineering Bay',
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('renders multiple custom desk names on the floor plan', () => {
    const deskNames = {
      'z1-d0': 'Alice Spot',
      'z2-d0': 'Design Corner',
      'z3-d0': 'Sales Hub',
    }
    exportSeatingPdf(buildData({ deskNames }))
    expect(mockText).toHaveBeenCalledWith('Alice Spot', expect.any(Number), expect.any(Number))
    expect(mockText).toHaveBeenCalledWith('Design Corner', expect.any(Number), expect.any(Number))
    expect(mockText).toHaveBeenCalledWith('Sales Hub', expect.any(Number), expect.any(Number))
  })
})
