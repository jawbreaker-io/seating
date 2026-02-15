import { motion } from 'motion/react'
import type { Employee } from '../types'
import { getDepartmentColor } from '../data'
import { useDragContext } from '../DragContext'

interface EmployeeChipProps {
  employee: Employee
  sourceDeskId: string | null
  size?: 'sm' | 'md'
  onRemove?: () => void
}

export function EmployeeChip({
  employee,
  sourceDeskId,
  size = 'md',
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
      className="relative group cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
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
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileDrag={{ scale: 1.15, zIndex: 50 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center text-white font-bold shadow-md`}
        style={{ backgroundColor: color }}
        title={`${employee.name} - ${employee.department}`}
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
