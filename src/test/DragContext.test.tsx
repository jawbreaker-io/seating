import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DragProvider } from '../DragContext'
import { useDragContext } from '../useDragContext'
import type { DragItem } from '../types'

function TestConsumer() {
  const { dragItem, startDrag, endDrag } = useDragContext()
  return (
    <div>
      <span data-testid="drag-state">
        {dragItem ? dragItem.employeeId : 'none'}
      </span>
      <button
        data-testid="start-btn"
        onClick={() =>
          startDrag({
            type: 'employee',
            employeeId: 'e1',
            sourceDeskId: 'z1-d0',
          } as DragItem)
        }
      >
        Start
      </button>
      <button data-testid="end-btn" onClick={() => endDrag()}>
        End
      </button>
    </div>
  )
}

describe('DragContext', () => {
  it('starts with no drag item', () => {
    render(
      <DragProvider>
        <TestConsumer />
      </DragProvider>,
    )
    expect(screen.getByTestId('drag-state')).toHaveTextContent('none')
  })

  it('sets drag item on startDrag', () => {
    render(
      <DragProvider>
        <TestConsumer />
      </DragProvider>,
    )
    act(() => {
      screen.getByTestId('start-btn').click()
    })
    expect(screen.getByTestId('drag-state')).toHaveTextContent('e1')
  })

  it('clears drag item on endDrag', () => {
    render(
      <DragProvider>
        <TestConsumer />
      </DragProvider>,
    )
    act(() => {
      screen.getByTestId('start-btn').click()
    })
    expect(screen.getByTestId('drag-state')).toHaveTextContent('e1')

    act(() => {
      screen.getByTestId('end-btn').click()
    })
    expect(screen.getByTestId('drag-state')).toHaveTextContent('none')
  })
})
