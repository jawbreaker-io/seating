import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { DragItem } from './types'
import { DragCtx } from './dragContextValue'

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
