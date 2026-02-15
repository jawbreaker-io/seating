import { motion } from 'motion/react'
import { HiOfficeBuilding } from 'react-icons/hi'
import { employees, desks } from '../data'
import type { SeatingMap } from '../types'
import { SharePanel } from './SharePanel'

interface HeaderProps {
  seating: SeatingMap
  onImport: (seating: SeatingMap) => void
}

export function Header({ seating, onImport }: HeaderProps) {
  const assigned = Object.values(seating).filter(Boolean).length
  const totalDesks = desks.length
  const totalPeople = employees.length

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <HiOfficeBuilding className="text-2xl text-blue-600" />
        </motion.div>
        <div>
          <h1 className="text-lg font-bold text-gray-800">
            Office Seating Chart
          </h1>
          <p className="text-xs text-gray-500">
            Drag and drop to rearrange seats
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          {assigned} seated
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          {totalPeople - assigned} unassigned
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          {totalDesks - assigned} empty desks
        </div>
        <SharePanel seating={seating} onImport={onImport} />
      </div>
    </header>
  )
}
