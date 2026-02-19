import { motion } from 'motion/react'
import { HiOfficeBuilding, HiPencil, HiSparkles, HiUserGroup, HiSwitchHorizontal, HiMoon, HiSun } from 'react-icons/hi'
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
  dark: boolean
  onToggleDark: () => void
  onImport: (payload: SharePayload) => void
  onEditLayout: () => void
  onEditPeople: () => void
  onOptimize: () => void
  onMovePlanner: () => void
}

export function Header({ seating, zones, desks, deskNames, unavailableDesks, pinnedDesks, employees, departmentColors, dark, onToggleDark, onImport, onEditLayout, onEditPeople, onOptimize, onMovePlanner }: HeaderProps) {
  const assigned = Object.values(seating).filter(Boolean).length
  const totalDesks = desks.length
  const unavailableCount = Object.keys(unavailableDesks).length
  const availableDesks = totalDesks - unavailableCount
  const totalPeople = employees.length
  const pinnedCount = Object.keys(pinnedDesks).filter((d) => seating[d]).length

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <HiOfficeBuilding className="text-4xl text-blue-600 dark:text-blue-400" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Office Seating Chart
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Drag and drop to rearrange seats
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-400" />
          {assigned} seated
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-400" />
          {totalPeople - assigned} unassigned
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
          {availableDesks - assigned} empty desks
        </div>
        {unavailableCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-300" />
            {unavailableCount} N/A
          </div>
        )}
        {pinnedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            {pinnedCount} pinned
          </div>
        )}
        <button
          data-testid="move-planner-btn"
          onClick={onMovePlanner}
          className="flex items-center gap-2 text-sm px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors font-medium"
        >
          <HiSwitchHorizontal className="text-base" />
          Move Planner
        </button>
        <button
          data-testid="optimize-btn"
          onClick={onOptimize}
          className="flex items-center gap-2 text-sm px-5 py-2.5 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors font-medium"
        >
          <HiSparkles className="text-base" />
          Optimize
        </button>
        <button
          data-testid="edit-people-btn"
          onClick={onEditPeople}
          className="flex items-center gap-2 text-sm px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors font-medium"
        >
          <HiUserGroup className="text-base" />
          Edit People
        </button>
        <button
          data-testid="edit-layout-btn"
          onClick={onEditLayout}
          className="flex items-center gap-2 text-sm px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          <HiPencil className="text-base" />
          Edit Layout
        </button>
        <button
          data-testid="dark-mode-toggle"
          onClick={onToggleDark}
          className="flex items-center gap-2 text-sm px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <HiSun className="text-lg" /> : <HiMoon className="text-lg" />}
        </button>
        <SharePanel seating={seating} zones={zones} desks={desks} deskNames={deskNames} unavailableDesks={unavailableDesks} pinnedDesks={pinnedDesks} employees={employees} departmentColors={departmentColors} onImport={onImport} />
      </div>
    </header>
  )
}
