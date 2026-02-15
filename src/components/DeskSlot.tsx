import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Desk, Employee } from '../types'
import { EmployeeChip } from './EmployeeChip'
import { useDragContext } from '../useDragContext'
import type { DragItem } from '../types'

interface DeskSlotProps {
  desk: Desk
  employee: Employee | null
  onDrop: (deskId: string, employeeId: string, sourceDeskId: string | null) => void
  onRemove: (deskId: string) => void
}

export function DeskSlot({ desk, employee, onDrop, onRemove }: DeskSlotProps) {
  const [isOver, setIsOver] = useState(false)
  const { dragItem } = useDragContext()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    try {
      const data = JSON.parse(
        e.dataTransfer.getData('application/json'),
      ) as DragItem
      if (data.type === 'employee') {
        // Don't drop on the same desk
        if (data.sourceDeskId === desk.id) return
        onDrop(desk.id, data.employeeId, data.sourceDeskId)
      }
    } catch {
      // ignore invalid drops
    }
  }

  const showDropTarget = isOver && dragItem !== null

  return (
    <motion.div
      data-testid={`desk-${desk.id}`}
      className={`
        relative w-20 h-20 rounded-xl border-2 border-dashed
        flex flex-col items-center justify-center gap-1
        transition-colors duration-150
        ${showDropTarget ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
        ${employee ? 'border-solid border-gray-200 shadow-sm' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <AnimatePresence mode="popLayout">
        {employee ? (
          <EmployeeChip
            key={employee.id}
            employee={employee}
            sourceDeskId={desk.id}
            size="sm"
            onRemove={() => onRemove(desk.id)}
          />
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="text-gray-400 text-[10px] text-center"
          >
            Empty
          </motion.div>
        )}
      </AnimatePresence>
      <span className="text-[9px] text-gray-400 absolute bottom-1">
        {desk.id.split('-').pop()?.toUpperCase()}
      </span>
    </motion.div>
  )
}
