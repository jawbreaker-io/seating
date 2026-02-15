import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HiBan } from 'react-icons/hi'
import type { Desk, Employee } from '../types'
import { EmployeeChip } from './EmployeeChip'
import { useDragContext } from '../useDragContext'
import type { DragItem } from '../types'

interface DeskSlotProps {
  desk: Desk
  employee: Employee | null
  name?: string
  unavailable?: boolean
  onDrop: (deskId: string, employeeId: string, sourceDeskId: string | null) => void
  onRemove: (deskId: string) => void
  onNameChange?: (deskId: string, name: string) => void
  onToggleUnavailable?: (deskId: string, unavailable: boolean) => void
}

export function DeskSlot({
  desk,
  employee,
  name,
  unavailable = false,
  onDrop,
  onRemove,
  onNameChange,
  onToggleUnavailable,
}: DeskSlotProps) {
  const [isOver, setIsOver] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { dragItem } = useDragContext()

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingName])

  const handleDragOver = (e: React.DragEvent) => {
    if (unavailable) return
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
    if (unavailable) return
    try {
      const data = JSON.parse(
        e.dataTransfer.getData('application/json'),
      ) as DragItem
      if (data.type === 'employee') {
        if (data.sourceDeskId === desk.id) return
        onDrop(desk.id, data.employeeId, data.sourceDeskId)
      }
    } catch {
      // ignore invalid drops
    }
  }

  const showDropTarget = isOver && dragItem !== null && !unavailable

  const displayLabel = name || desk.id.split('-').pop()?.toUpperCase() || ''

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(name || '')
    setIsEditingName(true)
  }

  const handleNameSubmit = () => {
    setIsEditingName(false)
    onNameChange?.(desk.id, editValue)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingName(false)
    }
  }

  const handleToggleUnavailable = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleUnavailable?.(desk.id, !unavailable)
  }

  if (unavailable) {
    return (
      <motion.div
        data-testid={`desk-${desk.id}`}
        className="relative w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 bg-gray-100 group"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)',
        }}
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <HiBan className="text-gray-300 text-lg" />
        <span className="text-[9px] text-gray-400 font-medium">N/A</span>
        <button
          data-testid={`desk-unavailable-toggle-${desk.id}`}
          onClick={handleToggleUnavailable}
          className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/60 transition-opacity text-gray-400 hover:text-green-500"
          title="Mark as available"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clipRule="evenodd" />
          </svg>
        </button>
        {isEditingName ? (
          <input
            ref={inputRef}
            data-testid={`desk-name-input-${desk.id}`}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            className="absolute bottom-0.5 w-16 text-[9px] text-center bg-white border border-gray-300 rounded px-0.5 py-0 focus:outline-none focus:ring-1 focus:ring-blue-300"
            maxLength={12}
          />
        ) : (
          <span
            onClick={handleLabelClick}
            data-testid={`desk-label-${desk.id}`}
            className="text-[9px] text-gray-400 absolute bottom-1 cursor-pointer hover:text-gray-600 truncate max-w-[4.5rem]"
            title={`Click to rename${name ? `: ${name}` : ''}`}
          >
            {displayLabel}
          </span>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      data-testid={`desk-${desk.id}`}
      className={`
        relative w-20 h-20 rounded-xl border-2 border-dashed
        flex flex-col items-center justify-center gap-1
        transition-colors duration-150 group
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
      <button
        data-testid={`desk-unavailable-toggle-${desk.id}`}
        onClick={handleToggleUnavailable}
        className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-opacity text-gray-300 hover:text-red-400"
        title="Mark as unavailable"
      >
        <HiBan className="w-3 h-3" />
      </button>
      {isEditingName ? (
        <input
          ref={inputRef}
          data-testid={`desk-name-input-${desk.id}`}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={handleNameKeyDown}
          className="absolute bottom-0.5 w-16 text-[9px] text-center bg-white border border-gray-300 rounded px-0.5 py-0 focus:outline-none focus:ring-1 focus:ring-blue-300"
          maxLength={12}
        />
      ) : (
        <span
          onClick={handleLabelClick}
          data-testid={`desk-label-${desk.id}`}
          className="text-[9px] text-gray-400 absolute bottom-1 cursor-pointer hover:text-gray-600 truncate max-w-[4.5rem]"
          title={`Click to rename${name ? `: ${name}` : ''}`}
        >
          {displayLabel}
        </span>
      )}
    </motion.div>
  )
}
