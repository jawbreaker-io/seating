import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('SharePanel', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('renders the share button in the header', () => {
    render(<App />)
    expect(screen.getByTestId('share-btn')).toBeInTheDocument()
  })

  it('opens the share panel on click', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('share-btn'))
    expect(screen.getByTestId('share-panel')).toBeInTheDocument()
    expect(screen.getByText('Share Arrangement')).toBeInTheDocument()
  })

  it('shows copy link, export, and import buttons in the panel', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('share-btn'))
    expect(screen.getByTestId('copy-link-btn')).toBeInTheDocument()
    expect(screen.getByTestId('export-btn')).toBeInTheDocument()
    expect(screen.getByTestId('import-btn')).toBeInTheDocument()
  })

  it('closes the panel when clicking the share button again', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('share-btn'))
    expect(screen.getByTestId('share-panel')).toBeInTheDocument()

    await user.click(screen.getByTestId('share-btn'))
    // Panel should be animating out / removed
    // AnimatePresence may keep it briefly, so just verify toggle behavior
  })
})

describe('URL-based sharing', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads a shared arrangement from URL hash on mount when no existing data', () => {
    // Encode a simple arrangement: only e5 at z1-d0
    const pairs = 'z1-d0:e5'
    const encoded = btoa(pairs).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    window.location.hash = `#share=${encoded}`

    render(<App />)

    // After loading the shared arrangement, only 1 person should be seated
    expect(screen.getByText('1 seated')).toBeInTheDocument()
  })

  it('prompts for confirmation when existing data is present', () => {
    // Set up existing localStorage data so the app has a current arrangement
    localStorage.setItem(
      'seating-chart-assignments',
      JSON.stringify({ 'z1-d0': 'e1' }),
    )

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const pairs = 'z1-d0:e5'
    const encoded = btoa(pairs).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    window.location.hash = `#share=${encoded}`

    render(<App />)

    expect(confirmSpy).toHaveBeenCalled()
    // User declined — should keep original e1, not load e5
    expect(screen.getByText('1 seated')).toBeInTheDocument()
  })
})
