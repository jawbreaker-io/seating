import { createContext } from 'react'
import type { DragItem } from './types'

export interface DragContextValue {
  dragItem: DragItem | null
  startDrag: (item: DragItem) => void
  endDrag: () => void
}

export const DragCtx = createContext<DragContextValue>({
  dragItem: null,
  startDrag: () => {},
  endDrag: () => {},
})
