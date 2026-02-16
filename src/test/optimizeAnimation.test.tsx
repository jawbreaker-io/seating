import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { AnimationMove } from '../components/OptimizeAnimation'
import type { Employee } from '../types'

// Mock motion/react before importing the component
vi.mock('motion/react', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')

  function createMotionComponent(tag: string) {
    return React.forwardRef(function MotionMock(props: Record<string, unknown>, ref: unknown) {
      const filteredProps: Record<string, unknown> = {}
      let onComplete: (() => void) | null = null

      for (const [key, value] of Object.entries(props)) {
        if (
          key === 'initial' ||
          key === 'animate' ||
          key === 'exit' ||
          key === 'transition' ||
          key === 'whileHover' ||
          key === 'whileDrag' ||
          key === 'layout' ||
          key === 'layoutId'
        ) {
          continue
        }
        if (key === 'onAnimationComplete') {
          onComplete = value as () => void
          continue
        }
        filteredProps[key] = value
      }

      React.useEffect(() => {
        if (onComplete) {
          const timer = setTimeout(onComplete, 5)
          return () => clearTimeout(timer)
        }
      }, []) // eslint-disable-line react-hooks/exhaustive-deps

      return React.createElement(tag, { ...filteredProps, ref })
    })
  }

  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) => createMotionComponent(prop),
    },
  )

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// Import the component AFTER the mock
const { OptimizeAnimation } = await import('../components/OptimizeAnimation')

const testEmployees: Employee[] = [
  { id: 'e1', name: 'Alice Chen', department: 'Engineering', avatar: 'AC' },
  { id: 'e2', name: 'Bob Martinez', department: 'Design', avatar: 'BM' },
  { id: 'e3', name: 'Carol Wu', department: 'Marketing', avatar: 'CW' },
]

const mockGetColor = (dept: string) => {
  const colors: Record<string, string> = {
    Engineering: '#3b82f6',
    Design: '#a855f7',
    Marketing: '#f97316',
  }
  return colors[dept] ?? '#6b7280'
}

function createDeskElement(deskId: string, x: number, y: number) {
  const el = document.createElement('div')
  el.setAttribute('data-testid', `desk-${deskId}`)
  el.getBoundingClientRect = () => ({
    left: x,
    top: y,
    right: x + 96,
    bottom: y + 96,
    width: 96,
    height: 96,
    x,
    y,
    toJSON: () => {},
  })
  document.body.appendChild(el)
  return el
}

describe('OptimizeAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders nothing when there are no moves', () => {
    const onComplete = vi.fn()
    const { container } = render(
      <OptimizeAnimation
        moves={[]}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={onComplete}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders a subtle loading overlay while measuring positions', () => {
    createDeskElement('z1-d0', 100, 100)
    createDeskElement('z1-d1', 200, 100)

    const moves: AnimationMove[] = [
      { empId: 'e1', fromDesk: 'z1-d0', toDesk: 'z1-d1' },
    ]

    const { container } = render(
      <OptimizeAnimation
        moves={moves}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={vi.fn()}
      />,
    )

    // Before the measurement timeout, a loading overlay is shown
    expect(container.querySelector('.fixed')).toBeInTheDocument()
  })

  it('renders employee avatars after positions are measured', async () => {
    createDeskElement('z1-d0', 100, 100)
    createDeskElement('z1-d1', 200, 100)

    const moves: AnimationMove[] = [
      { empId: 'e1', fromDesk: 'z1-d0', toDesk: 'z1-d1' },
    ]

    render(
      <OptimizeAnimation
        moves={moves}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={vi.fn()}
      />,
    )

    // Advance past the 80ms measurement delay
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText('AC')).toBeInTheDocument()
  })

  it('renders multiple employee avatars for multiple moves', async () => {
    createDeskElement('z1-d0', 100, 100)
    createDeskElement('z1-d1', 200, 100)
    createDeskElement('z2-d0', 100, 300)

    const moves: AnimationMove[] = [
      { empId: 'e1', fromDesk: 'z1-d0', toDesk: 'z1-d1' },
      { empId: 'e2', fromDesk: 'z1-d1', toDesk: 'z2-d0' },
    ]

    render(
      <OptimizeAnimation
        moves={moves}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={vi.fn()}
      />,
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('BM')).toBeInTheDocument()
  })

  it('calls onComplete after animations and post-delay', async () => {
    createDeskElement('z1-d0', 100, 100)
    createDeskElement('z1-d1', 200, 100)

    const onComplete = vi.fn()
    const moves: AnimationMove[] = [
      { empId: 'e1', fromDesk: 'z1-d0', toDesk: 'z1-d1' },
    ]

    render(
      <OptimizeAnimation
        moves={moves}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={onComplete}
      />,
    )

    // Measurement delay (80ms) + mock animation complete (5ms) + post-animation delay (450ms)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    await act(async () => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('handles moves from unassigned sidebar position', async () => {
    createDeskElement('z1-d0', 100, 100)

    const moves: AnimationMove[] = [
      { empId: 'e3', fromDesk: '(unassigned)', toDesk: 'z1-d0' },
    ]

    render(
      <OptimizeAnimation
        moves={moves}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={vi.fn()}
      />,
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    // Avatar should render even for sidebar-originating moves
    expect(screen.getByText('CW')).toBeInTheDocument()
  })

  it('renders progress indicator text', async () => {
    createDeskElement('z1-d0', 100, 100)
    createDeskElement('z1-d1', 200, 100)

    const moves: AnimationMove[] = [
      { empId: 'e1', fromDesk: 'z1-d0', toDesk: 'z1-d1' },
    ]

    render(
      <OptimizeAnimation
        moves={moves}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={vi.fn()}
      />,
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    // Should show progress text (either "Moving X of Y" or "All settled!")
    expect(screen.getByText(/Moving|All settled/)).toBeInTheDocument()
  })

  it('applies correct department color to avatar background', async () => {
    createDeskElement('z1-d0', 100, 100)
    createDeskElement('z1-d1', 200, 100)

    const moves: AnimationMove[] = [
      { empId: 'e1', fromDesk: 'z1-d0', toDesk: 'z1-d1' },
    ]

    render(
      <OptimizeAnimation
        moves={moves}
        employees={testEmployees}
        getDepartmentColor={mockGetColor}
        onComplete={vi.fn()}
      />,
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    // The avatar div should have the Engineering color
    const avatarEl = screen.getByText('AC')
    expect(avatarEl).toHaveStyle({ backgroundColor: '#3b82f6' })
  })
})
