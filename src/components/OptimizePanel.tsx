import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HiSparkles, HiSwitchHorizontal, HiLightningBolt, HiCheck } from 'react-icons/hi'
import type { Desk, Employee, SeatingMap, PinnedDeskMap, UnavailableDeskMap, DeskNameMap, OptimizationMode, OptimizationResult } from '../types'
import type { AnimationMove } from './OptimizeAnimation'
import { optimizeSeating } from '../optimizer'
import { getDepartmentColor } from '../data'

// Pre-computed particle positions for celebration effect (deterministic per index)
const PARTICLE_POSITIONS = Array.from({ length: 20 }, (_, i) => {
  // Use a simple deterministic spread based on index
  const angle = (i / 20) * Math.PI * 2 + (i % 3) * 0.5
  const radius = 120 + (i % 4) * 60
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
})

interface OptimizePanelProps {
  seating: SeatingMap
  desks: Desk[]
  deskNames: DeskNameMap
  pinnedDesks: PinnedDeskMap
  unavailableDesks: UnavailableDeskMap
  employees: Employee[]
  onApply: (seating: SeatingMap, moves: AnimationMove[]) => void
  onClose: () => void
}

export function OptimizePanel({
  seating,
  desks,
  deskNames,
  pinnedDesks,
  unavailableDesks,
  employees,
  onApply,
  onClose,
}: OptimizePanelProps) {
  const [mode, setMode] = useState<OptimizationMode>('minimize-moves')
  const [applied, setApplied] = useState(false)

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const result: OptimizationResult = useMemo(
    () => optimizeSeating(seating, desks, pinnedDesks, unavailableDesks, mode, employees),
    [seating, desks, pinnedDesks, unavailableDesks, mode, employees],
  )

  const movedEmployees = useMemo(() => {
    const moved: { empId: string; fromDesk: string; toDesk: string }[] = []
    const empToOldDesk = new Map<string, string>()
    for (const [deskId, empId] of Object.entries(seating)) {
      if (empId) empToOldDesk.set(empId, deskId)
    }
    for (const [deskId, empId] of Object.entries(result.seating)) {
      if (!empId) continue
      const oldDesk = empToOldDesk.get(empId)
      if (oldDesk !== deskId) {
        moved.push({ empId, fromDesk: oldDesk ?? '(unassigned)', toDesk: deskId })
      }
    }
    return moved
  }, [seating, result.seating])

  const handleApply = useCallback(() => {
    setApplied(true)
    setTimeout(() => {
      onApply(result.seating, movedEmployees)
      onClose()
    }, 500)
  }, [result.seating, movedEmployees, onApply, onClose])

  const pinnedCount = Object.keys(pinnedDesks).filter((d) => seating[d]).length
  const scoreImprovement = result.clusterScore - result.previousScore

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <HiSparkles className="text-purple-500 dark:text-purple-400 text-xl" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Optimize Seating</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Group employees by department to keep teams together
          </p>
        </div>

        {/* Mode selection */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-2">
            <button
              data-testid="optimize-mode-minimize"
              onClick={() => setMode('minimize-moves')}
              className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${
                mode === 'minimize-moves'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <HiSwitchHorizontal className={`text-base ${mode === 'minimize-moves' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                <span className={`text-sm font-semibold ${mode === 'minimize-moves' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  Minimize Moves
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Improve grouping with fewest office changes
              </p>
            </button>
            <button
              data-testid="optimize-mode-full"
              onClick={() => setMode('full')}
              className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${
                mode === 'full'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <HiLightningBolt className={`text-base ${mode === 'full' ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                <span className={`text-sm font-semibold ${mode === 'full' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  Full Optimize
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Best grouping regardless of move count
              </p>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 pb-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{result.moves}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Moves Required</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className={`text-xl font-bold ${scoreImprovement > 0 ? 'text-green-600' : 'text-gray-800 dark:text-gray-100'}`}>
                {scoreImprovement > 0 ? '+' : ''}{scoreImprovement}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Score Change</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-600">{pinnedCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pinned</div>
            </div>
          </div>
        </div>

        {/* Move list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          {movedEmployees.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Proposed Changes
              </p>
              {movedEmployees.map(({ empId, fromDesk, toDesk }, i) => {
                const emp = employeeMap.get(empId)
                if (!emp) return null
                return (
                  <motion.div
                    key={empId}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: getDepartmentColor(emp.department) }}
                    >
                      {emp.avatar}
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200 flex-1 truncate">{emp.name}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs flex-shrink-0">
                      {deskNames[fromDesk] || fromDesk.split('-').pop()?.toUpperCase()}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0">
                      <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-200 text-xs font-medium flex-shrink-0">
                      {deskNames[toDesk] || toDesk.split('-').pop()?.toUpperCase()}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
              <HiCheck className="text-3xl text-green-400 mb-2" />
              <p className="text-sm font-medium">Already optimal!</p>
              <p className="text-xs">No changes needed</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 text-sm px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            data-testid="optimize-apply-btn"
            onClick={handleApply}
            disabled={movedEmployees.length === 0 || applied}
            className={`flex-1 text-sm px-4 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              applied
                ? 'bg-green-500 text-white'
                : movedEmployees.length === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : mode === 'full'
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {applied ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <HiCheck className="text-sm" />
                </motion.div>
                Applied!
              </>
            ) : (
              <>
                <HiSparkles className="text-sm" />
                Apply {result.moves} {result.moves === 1 ? 'Move' : 'Moves'}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Celebration particles when applied */}
      <AnimatePresence>
        {applied && (
          <>
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="fixed w-2 h-2 rounded-full pointer-events-none"
                style={{
                  backgroundColor: ['#3b82f6', '#a855f7', '#f97316', '#10b981', '#ec4899', '#eab308'][i % 6],
                  left: '50%',
                  top: '50%',
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: PARTICLE_POSITIONS[i].x,
                  y: PARTICLE_POSITIONS[i].y,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
