import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { DragItem } from './types'

interface DragContextValue {
  dragItem: DragItem | null
  startDrag: (item: DragItem) => void
  endDrag: () => void
}

const DragCtx = createContext<DragContextValue>({
  dragItem: null,
  startDrag: () => {},
  endDrag: () => {},
})

export function useDragContext() {
  return useContext(DragCtx)
}

export function DragProvider({ children }: { children: ReactNode }) {
  const [dragItem, setDragItem] = useState<DragItem | null>(null)

  const startDrag = useCallback((item: DragItem) => {
    setDragItem(item)
  }, [])

  const endDrag = useCallback(() => {
    setDragItem(null)
  }, [])

  return (
    <DragCtx.Provider value={{ dragItem, startDrag, endDrag }}>
      {children}
    </DragCtx.Provider>
  )
}
