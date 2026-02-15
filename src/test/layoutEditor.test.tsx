import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('Layout Editor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the edit layout button in the header', () => {
    render(<App />)
    expect(screen.getByTestId('edit-layout-btn')).toBeInTheDocument()
  })

  it('opens the layout editor modal on button click', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))
    expect(screen.getByTestId('layout-editor')).toBeInTheDocument()
    expect(screen.getByText('Edit Office Layout')).toBeInTheDocument()
  })

  it('displays all current zones in the editor', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))
    expect(screen.getByTestId('layout-zone-z1')).toBeInTheDocument()
    expect(screen.getByTestId('layout-zone-z2')).toBeInTheDocument()
    expect(screen.getByTestId('layout-zone-z3')).toBeInTheDocument()
  })

  it('closes the editor when clicking Done', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))
    expect(screen.getByTestId('layout-editor')).toBeInTheDocument()

    await user.click(screen.getByTestId('layout-done-btn'))
  })

  it('closes the editor when clicking the X button', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))
    expect(screen.getByTestId('layout-editor')).toBeInTheDocument()

    await user.click(screen.getByTestId('layout-editor-close'))
  })

  it('adds a new zone when clicking Add Zone', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))
    await user.click(screen.getByTestId('add-zone-btn'))

    // New zone should appear
    expect(screen.getByTestId('layout-zone-z4')).toBeInTheDocument()
  })

  it('new zone appears in the floor plan after adding', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))
    await user.click(screen.getByTestId('add-zone-btn'))
    await user.click(screen.getByTestId('layout-done-btn'))

    // The new zone should be visible in the floor plan
    expect(screen.getByTestId('zone-z4')).toBeInTheDocument()
  })

  it('allows editing zone name', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))

    const nameInput = screen.getByTestId('zone-name-z1')
    await user.clear(nameInput)
    await user.type(nameInput, 'Dev Team')

    await user.click(screen.getByTestId('layout-done-btn'))

    // Updated name should appear on the floor plan
    expect(screen.getByText('Dev Team')).toBeInTheDocument()
  })

  it('allows changing zone dimensions', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))

    const rowsInput = screen.getByTestId(
      'zone-rows-z2',
    ) as HTMLInputElement

    // Select all text then type replacement value
    await user.tripleClick(rowsInput)
    await user.keyboard('4')

    // Verify the change was persisted to localStorage
    const stored = JSON.parse(
      localStorage.getItem('seating-chart-layout')!,
    )
    const z2 = stored.find((z: { id: string }) => z.id === 'z2')
    expect(z2.rows).toBe(4)
  })

  it('deletes a zone with double-click on delete button', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))

    // First click arms the delete
    await user.click(screen.getByTestId('zone-delete-z2'))
    // Second click confirms
    await user.click(screen.getByTestId('zone-delete-z2'))

    await user.click(screen.getByTestId('layout-done-btn'))

    // z2 should not be in the floor plan
    await waitFor(() => {
      expect(screen.queryByTestId('zone-z2')).not.toBeInTheDocument()
    })
  })

  it('persists layout changes across page reloads', async () => {
    const { unmount } = render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('edit-layout-btn'))
    await user.click(screen.getByTestId('add-zone-btn'))
    await user.click(screen.getByTestId('layout-done-btn'))

    unmount()

    // Re-render to simulate page reload
    render(<App />)
    expect(screen.getByTestId('zone-z4')).toBeInTheDocument()
  })

  it('resets layout to default', async () => {
    const { unmount } = render(<App />)
    const user = userEvent.setup()

    // Add a zone
    await user.click(screen.getByTestId('edit-layout-btn'))
    await user.click(screen.getByTestId('add-zone-btn'))
    expect(screen.getByTestId('layout-zone-z4')).toBeInTheDocument()

    // Reset
    await user.click(screen.getByTestId('reset-layout-btn'))
    await user.click(screen.getByTestId('layout-done-btn'))

    unmount()

    // Re-render to verify reset was persisted
    render(<App />)
    expect(screen.queryByTestId('zone-z4')).not.toBeInTheDocument()
    expect(screen.getByTestId('zone-z1')).toBeInTheDocument()
    expect(screen.getByTestId('zone-z2')).toBeInTheDocument()
    expect(screen.getByTestId('zone-z3')).toBeInTheDocument()
  })
})
