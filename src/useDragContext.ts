import { useContext } from 'react'
import { DragCtx } from './dragContextValue'

export function useDragContext() {
  return useContext(DragCtx)
}
