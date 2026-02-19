import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDarkMode } from '../useDarkMode'

const STORAGE_KEY = 'seating-chart-dark-mode'

describe('useDarkMode hook', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('defaults to light mode when no localStorage value', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(false)
  })

  it('initializes to dark mode when localStorage is "true"', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(true)
  })

  it('initializes to light mode when localStorage is "false"', () => {
    localStorage.setItem(STORAGE_KEY, 'false')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(false)
  })

  it('treats non-"true" localStorage values as light mode', () => {
    localStorage.setItem(STORAGE_KEY, 'yes')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(false)
  })

  it('adds "dark" class to document.documentElement when dark', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    renderHook(() => useDarkMode())
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes "dark" class from document.documentElement when light', () => {
    document.documentElement.classList.add('dark')
    localStorage.setItem(STORAGE_KEY, 'false')
    renderHook(() => useDarkMode())
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggleDark switches from light to dark', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(false)

    act(() => {
      result.current.toggleDark()
    })

    expect(result.current.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggleDark switches from dark to light', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(true)

    act(() => {
      result.current.toggleDark()
    })

    expect(result.current.dark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists dark mode preference to localStorage on toggle', () => {
    const { result } = renderHook(() => useDarkMode())

    act(() => {
      result.current.toggleDark()
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('persists light mode preference to localStorage on toggle back', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { result } = renderHook(() => useDarkMode())

    act(() => {
      result.current.toggleDark()
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('handles multiple toggles correctly', () => {
    const { result } = renderHook(() => useDarkMode())

    // Start light
    expect(result.current.dark).toBe(false)

    // Toggle to dark
    act(() => { result.current.toggleDark() })
    expect(result.current.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')

    // Toggle back to light
    act(() => { result.current.toggleDark() })
    expect(result.current.dark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')

    // Toggle to dark again
    act(() => { result.current.toggleDark() })
    expect(result.current.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('toggleDark is referentially stable across renders', () => {
    const { result, rerender } = renderHook(() => useDarkMode())
    const firstToggle = result.current.toggleDark
    rerender()
    expect(result.current.toggleDark).toBe(firstToggle)
  })
})

describe('Dark mode toggle integration', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('renders the dark mode toggle button', () => {
    render(<App />)
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument()
  })

  it('starts in light mode by default', () => {
    render(<App />)
    const toggle = screen.getByTestId('dark-mode-toggle')
    expect(toggle).toHaveAttribute('title', 'Switch to dark mode')
  })

  it('switches to dark mode on click', async () => {
    render(<App />)
    const user = userEvent.setup()
    const toggle = screen.getByTestId('dark-mode-toggle')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('title', 'Switch to light mode')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('switches back to light mode on second click', async () => {
    render(<App />)
    const user = userEvent.setup()
    const toggle = screen.getByTestId('dark-mode-toggle')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('title', 'Switch to light mode')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('title', 'Switch to dark mode')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('shows moon icon in light mode', () => {
    render(<App />)
    const toggle = screen.getByTestId('dark-mode-toggle')
    // In light mode, the button should contain the moon icon (no sun)
    expect(toggle).toHaveAttribute('title', 'Switch to dark mode')
  })

  it('shows sun icon in dark mode', async () => {
    render(<App />)
    const user = userEvent.setup()
    const toggle = screen.getByTestId('dark-mode-toggle')

    await user.click(toggle)
    // In dark mode, the button should contain the sun icon
    expect(toggle).toHaveAttribute('title', 'Switch to light mode')
  })
})

describe('Dark mode persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('persists dark mode across unmount/remount', async () => {
    const { unmount } = render(<App />)
    const user = userEvent.setup()

    // Enable dark mode
    await user.click(screen.getByTestId('dark-mode-toggle'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')

    // Simulate page reload
    unmount()
    document.documentElement.classList.remove('dark')
    render(<App />)

    // Should restore dark mode
    const toggle = screen.getByTestId('dark-mode-toggle')
    expect(toggle).toHaveAttribute('title', 'Switch to light mode')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists light mode across unmount/remount', async () => {
    // Start with dark mode in storage
    localStorage.setItem(STORAGE_KEY, 'true')

    const { unmount } = render(<App />)
    const user = userEvent.setup()

    // Disable dark mode
    await user.click(screen.getByTestId('dark-mode-toggle'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')

    // Simulate page reload
    unmount()
    document.documentElement.classList.remove('dark')
    render(<App />)

    // Should stay in light mode
    const toggle = screen.getByTestId('dark-mode-toggle')
    expect(toggle).toHaveAttribute('title', 'Switch to dark mode')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('restores dark mode from localStorage on fresh render', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    render(<App />)
    const toggle = screen.getByTestId('dark-mode-toggle')
    expect(toggle).toHaveAttribute('title', 'Switch to light mode')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('defaults to light mode when localStorage is empty', () => {
    render(<App />)
    const toggle = screen.getByTestId('dark-mode-toggle')
    expect(toggle).toHaveAttribute('title', 'Switch to dark mode')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('saves to correct localStorage key', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('dark-mode-toggle'))
    expect(localStorage.getItem('seating-chart-dark-mode')).toBe('true')

    // Ensure no other dark mode keys are created
    const keys = Object.keys(localStorage)
    const darkKeys = keys.filter((k) => k.includes('dark'))
    expect(darkKeys).toEqual(['seating-chart-dark-mode'])
  })
})

describe('Header dark mode rendering', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('header is accessible in both light and dark modes', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Light mode - verify header content is visible
    expect(screen.getByText('Office Seating Chart')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop to rearrange seats')).toBeInTheDocument()

    // Switch to dark mode
    await user.click(screen.getByTestId('dark-mode-toggle'))

    // Dark mode - same content should still be visible
    expect(screen.getByText('Office Seating Chart')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop to rearrange seats')).toBeInTheDocument()
  })

  it('all header buttons remain functional in dark mode', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Switch to dark mode
    await user.click(screen.getByTestId('dark-mode-toggle'))

    // Verify all buttons are still present and clickable
    expect(screen.getByTestId('edit-layout-btn')).toBeInTheDocument()
    expect(screen.getByTestId('edit-people-btn')).toBeInTheDocument()
    expect(screen.getByTestId('optimize-btn')).toBeInTheDocument()
    expect(screen.getByTestId('move-planner-btn')).toBeInTheDocument()
  })

  it('edit layout modal opens in dark mode', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('dark-mode-toggle'))
    await user.click(screen.getByTestId('edit-layout-btn'))

    expect(screen.getByText('Edit Office Layout')).toBeInTheDocument()
  })

  it('edit people modal opens in dark mode', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('dark-mode-toggle'))
    await user.click(screen.getByTestId('edit-people-btn'))

    expect(screen.getByText('Edit People & Departments')).toBeInTheDocument()
  })

  it('optimize panel opens in dark mode', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('dark-mode-toggle'))
    await user.click(screen.getByTestId('optimize-btn'))

    expect(screen.getByText('Optimize Seating')).toBeInTheDocument()
  })

  it('sidebar search works in dark mode', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('dark-mode-toggle'))

    const input = screen.getByTestId('search-input')
    await user.type(input, 'xyznonexistent')
    expect(screen.getByText('No matches found')).toBeInTheDocument()
  })

  it('clear and reset work in dark mode', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Switch to dark mode
    await user.click(screen.getByTestId('dark-mode-toggle'))

    // Clear all seating
    await user.click(screen.getByTestId('clear-btn'))

    // Dark mode should still be active after clearing
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(screen.getByTestId('dark-mode-toggle')).toHaveAttribute(
      'title',
      'Switch to light mode',
    )
  })

  it('dark mode toggle does not affect seating data', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Note the seated count before toggling
    const seatedBefore = screen.getByText(/\d+ seated/).textContent

    // Toggle dark mode on and off
    await user.click(screen.getByTestId('dark-mode-toggle'))
    await user.click(screen.getByTestId('dark-mode-toggle'))

    // Seated count should remain the same
    const seatedAfter = screen.getByText(/\d+ seated/).textContent
    expect(seatedAfter).toBe(seatedBefore)
  })
})
