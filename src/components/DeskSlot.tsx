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
  pinned?: boolean
  onDrop: (deskId: string, employeeId: string, sourceDeskId: string | null) => void
  onRemove: (deskId: string) => void
  onNameChange?: (deskId: string, name: string) => void
  onToggleUnavailable?: (deskId: string, unavailable: boolean) => void
  onTogglePin?: (deskId: string) => void
}

export function DeskSlot({
  desk,
  employee,
  name,
  unavailable = false,
  pinned = false,
  onDrop,
  onRemove,
  onNameChange,
  onToggleUnavailable,
  onTogglePin,
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

  const [justDropped, setJustDropped] = useState(false)

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
        setJustDropped(true)
        setTimeout(() => setJustDropped(false), 400)
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

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    onTogglePin?.(desk.id)
  }

  return (
    <motion.div
      data-testid={`desk-${desk.id}`}
      className={`
        relative w-20 h-20 rounded-xl border-2
        flex flex-col items-center justify-center gap-1
        transition-colors duration-150 group
        ${pinned ? 'border-solid border-amber-400 bg-amber-50 ring-1 ring-amber-200' : ''}
        ${showDropTarget && !pinned ? 'border-dashed border-blue-500 bg-blue-50' : ''}
        ${!pinned && !showDropTarget && employee ? 'border-solid border-gray-200 shadow-sm' : ''}
        ${!pinned && !showDropTarget && !employee ? 'border-dashed border-gray-300 bg-white' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      layout
      animate={justDropped ? { scale: [1, 1.08, 0.95, 1.03, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {pinned && (
        <motion.div
          className="absolute -top-1.5 -left-1.5 z-10"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 45 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" className="w-2.5 h-2.5">
              <path d="M8.5 1.5a.5.5 0 0 0-1 0v4.586L5.354 3.94a.5.5 0 1 0-.708.708L7 7.001V12.5a.5.5 0 0 0 .146.354l1.5 1.5a.5.5 0 0 0 .708-.708L8.5 12.793V7.001l2.354-2.354a.5.5 0 0 0-.708-.708L8.5 5.586V1.5z" />
            </svg>
          </div>
        </motion.div>
      )}
      <AnimatePresence mode="popLayout">
        {employee ? (
          <EmployeeChip
            key={employee.id}
            employee={employee}
            sourceDeskId={desk.id}
            size="sm"
            pinned={pinned}
            onRemove={pinned ? undefined : () => onRemove(desk.id)}
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
      {employee && (
        <button
          data-testid={`desk-pin-toggle-${desk.id}`}
          onClick={handleTogglePin}
          className={`absolute top-0.5 left-0.5 p-0.5 rounded transition-opacity ${
            pinned
              ? 'opacity-100 text-amber-500 hover:text-amber-700'
              : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-amber-500'
          }`}
          title={pinned ? 'Unpin employee' : 'Pin employee to this desk'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M8.5 1.5a.5.5 0 0 0-1 0v4.586L5.354 3.94a.5.5 0 1 0-.708.708L7 7.001V12.5a.5.5 0 0 0 .146.354l1.5 1.5a.5.5 0 0 0 .708-.708L8.5 12.793V7.001l2.354-2.354a.5.5 0 0 0-.708-.708L8.5 5.586V1.5z" />
          </svg>
        </button>
      )}
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
