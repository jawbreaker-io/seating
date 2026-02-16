import { motion } from 'motion/react'
import { HiOfficeBuilding, HiPencil, HiSparkles, HiUserGroup } from 'react-icons/hi'
import type { Desk, Employee, Zone, SeatingMap, DeskNameMap, UnavailableDeskMap, PinnedDeskMap } from '../types'
import { SharePanel } from './SharePanel'
import type { SharePayload } from '../shareUtils'

interface HeaderProps {
  seating: SeatingMap
  zones: Zone[]
  desks: Desk[]
  deskNames: DeskNameMap
  unavailableDesks: UnavailableDeskMap
  pinnedDesks: PinnedDeskMap
  employees: Employee[]
  departmentColors: Record<string, string>
  onImport: (payload: SharePayload) => void
  onEditLayout: () => void
  onEditPeople: () => void
  onOptimize: () => void
}

export function Header({ seating, zones, desks, deskNames, unavailableDesks, pinnedDesks, employees, departmentColors, onImport, onEditLayout, onEditPeople, onOptimize }: HeaderProps) {
  const assigned = Object.values(seating).filter(Boolean).length
  const totalDesks = desks.length
  const unavailableCount = Object.keys(unavailableDesks).length
  const availableDesks = totalDesks - unavailableCount
  const totalPeople = employees.length
  const pinnedCount = Object.keys(pinnedDesks).filter((d) => seating[d]).length

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <HiOfficeBuilding className="text-3xl text-blue-600" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Office Seating Chart
          </h1>
          <p className="text-sm text-gray-500">
            Drag and drop to rearrange seats
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          {assigned} seated
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          {totalPeople - assigned} unassigned
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          {availableDesks - assigned} empty desks
        </div>
        {unavailableCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
            {unavailableCount} N/A
          </div>
        )}
        {pinnedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            {pinnedCount} pinned
          </div>
        )}
        <button
          data-testid="optimize-btn"
          onClick={onOptimize}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium"
        >
          <HiSparkles className="text-base" />
          Optimize
        </button>
        <button
          data-testid="edit-people-btn"
          onClick={onEditPeople}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
        >
          <HiUserGroup className="text-base" />
          Edit People
        </button>
        <button
          data-testid="edit-layout-btn"
          onClick={onEditLayout}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          <HiPencil className="text-base" />
          Edit Layout
        </button>
        <SharePanel seating={seating} zones={zones} desks={desks} deskNames={deskNames} unavailableDesks={unavailableDesks} pinnedDesks={pinnedDesks} employees={employees} departmentColors={departmentColors} onImport={onImport} />
      </div>
    </header>
  )
}
