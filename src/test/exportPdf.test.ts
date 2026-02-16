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
})
