import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { employees, zones, defaultSeating } from '../data'

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the header with correct title', () => {
    render(<App />)
    expect(screen.getByText('Office Seating Chart')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<App />)
    expect(
      screen.getByText('Drag and drop to rearrange seats'),
    ).toBeInTheDocument()
  })

  it('renders all zone names', () => {
    render(<App />)
    for (const zone of zones) {
      expect(screen.getByText(zone.name)).toBeInTheDocument()
    }
  })

  it('shows seated count in header', () => {
    render(<App />)
    const assignedCount = Object.values(defaultSeating).filter(Boolean).length
    expect(screen.getByText(`${assignedCount} seated`)).toBeInTheDocument()
  })

  it('shows unassigned count in header', () => {
    render(<App />)
    const assignedCount = Object.values(defaultSeating).filter(Boolean).length
    const unassignedCount = employees.length - assignedCount
    expect(
      screen.getByText(`${unassignedCount} unassigned`),
    ).toBeInTheDocument()
  })

  it('renders the sidebar with unassigned employees', () => {
    render(<App />)
    const assignedIds = new Set(
      Object.values(defaultSeating).filter(Boolean),
    )
    const unassignedEmps = employees.filter((e) => !assignedIds.has(e.id))

    expect(
      screen.getByText(`Unassigned (${unassignedEmps.length})`),
    ).toBeInTheDocument()
  })

  it('renders reset and clear buttons', () => {
    render(<App />)
    expect(screen.getByTestId('reset-btn')).toBeInTheDocument()
    expect(screen.getByTestId('clear-btn')).toBeInTheDocument()
  })

  it('renders the search input', () => {
    render(<App />)
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
  })
})

describe('Sidebar search', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('filters employees by name', async () => {
    render(<App />)
    const user = userEvent.setup()
    const input = screen.getByTestId('search-input')

    // Get unassigned employees first
    const assignedIds = new Set(
      Object.values(defaultSeating).filter(Boolean),
    )
    const unassigned = employees.filter((e) => !assignedIds.has(e.id))

    if (unassigned.length > 0) {
      const searchTarget = unassigned[0]
      await user.type(input, searchTarget.name.split(' ')[0])

      // The searched employee should still be visible
      expect(screen.getByText(searchTarget.name)).toBeInTheDocument()
    }
  })

  it('shows no matches message for gibberish search', async () => {
    render(<App />)
    const user = userEvent.setup()
    const input = screen.getByTestId('search-input')

    await user.type(input, 'xyznonexistent')
    expect(screen.getByText('No matches found')).toBeInTheDocument()
  })
})

describe('Clear All functionality', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('clears all seating assignments', async () => {
    render(<App />)
    const user = userEvent.setup()

    const clearBtn = screen.getByTestId('clear-btn')
    await user.click(clearBtn)

    // After clearing, all employees should be unassigned
    expect(
      screen.getByText(`Unassigned (${employees.length})`),
    ).toBeInTheDocument()
    expect(screen.getByText(`${employees.length} unassigned`)).toBeInTheDocument()
  })
})

describe('Reset functionality', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('restores default seating after clear', async () => {
    render(<App />)
    const user = userEvent.setup()

    const assignedCount = Object.values(defaultSeating).filter(Boolean).length
    const unassignedCount = employees.length - assignedCount

    // Clear first
    await user.click(screen.getByTestId('clear-btn'))
    expect(
      screen.getByText(`Unassigned (${employees.length})`),
    ).toBeInTheDocument()

    // Reset
    await user.click(screen.getByTestId('reset-btn'))
    expect(
      screen.getByText(`Unassigned (${unassignedCount})`),
    ).toBeInTheDocument()
    expect(screen.getByText(`${assignedCount} seated`)).toBeInTheDocument()
  })
})

describe('Desk rendering', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders desk slots for each zone', () => {
    render(<App />)
    for (const zone of zones) {
      expect(screen.getByTestId(`zone-${zone.id}`)).toBeInTheDocument()
    }
  })

  it('renders employee chips for assigned desks', () => {
    render(<App />)
    // Check that some employee chips are rendered on desks
    const assignedEmpIds = Object.values(defaultSeating).filter(Boolean) as string[]
    for (const empId of assignedEmpIds.slice(0, 3)) {
      expect(screen.getByTestId(`employee-chip-${empId}`)).toBeInTheDocument()
    }
  })
})
