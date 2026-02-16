import { motion } from 'motion/react'
import type { Employee } from '../types'
import { useDragContext } from '../useDragContext'

interface EmployeeChipProps {
  employee: Employee
  getDepartmentColor: (department: string) => string
  sourceDeskId: string | null
  size?: 'sm' | 'md'
  pinned?: boolean
  onRemove?: () => void
}

export function EmployeeChip({
  employee,
  getDepartmentColor,
  sourceDeskId,
  size = 'md',
  pinned = false,
  onRemove,
}: EmployeeChipProps) {
  const { startDrag, endDrag } = useDragContext()
  const color = getDepartmentColor(employee.department)

  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8 text-[10px]'
      : 'w-10 h-10 text-xs'

  return (
    <motion.div
      data-testid={`employee-chip-${employee.id}`}
      className={`relative group ${pinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      draggable={!pinned}
      onDragStart={(e) => {
        if (pinned) {
          e.preventDefault()
          return
        }
        const event = e as unknown as React.DragEvent
        event.dataTransfer?.setData(
          'application/json',
          JSON.stringify({
            type: 'employee',
            employeeId: employee.id,
            sourceDeskId,
          }),
        )
        startDrag({ type: 'employee', employeeId: employee.id, sourceDeskId })
      }}
      onDragEnd={() => endDrag()}
      layout
      layoutId={`employee-${employee.id}`}
      initial={{ scale: 0, opacity: 0, rotate: -180 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0, rotate: 180 }}
      whileHover={pinned ? {} : { scale: 1.15, rotate: [0, -5, 5, 0] }}
      whileDrag={pinned ? {} : { scale: 1.2, zIndex: 50, boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.8 }}
    >
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center text-white font-bold shadow-md ${pinned ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
        style={{ backgroundColor: color }}
        title={`${employee.name} - ${employee.department}${pinned ? ' (pinned)' : ''}`}
      >
        {employee.avatar}
      </div>
      {onRemove && (
        <button
          data-testid={`remove-${employee.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </motion.div>
  )
}
