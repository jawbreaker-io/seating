import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'motion/react'
import { HiSwitchHorizontal } from 'react-icons/hi'
import type { Employee } from '../types'

export interface AnimationMove {
  empId: string
  fromDesk: string
  toDesk: string
}

interface OptimizeAnimationProps {
  moves: AnimationMove[]
  employees: Employee[]
  getDepartmentColor: (department: string) => string
  onComplete: () => void
}

const STAGGER_DELAY = 0.18 // seconds between each move starting
const MOVE_DURATION = 0.65 // seconds for each chip's flight
const ARC_HEIGHT = 70 // pixels above the straight line for the arc peak
const POST_ANIMATION_DELAY = 450 // ms to linger after last chip lands

export function OptimizeAnimation({
  moves,
  employees,
  getDepartmentColor,
  onComplete,
}: OptimizeAnimationProps) {
  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  )

  const [deskPositions, setDeskPositions] = useState<Map<string, { x: number; y: number }> | null>(null)
  const [completedCount, setCompletedCount] = useState(0)

  // Measure desk element positions after a brief delay (to let the modal fully close)
  useEffect(() => {
    const timer = setTimeout(() => {
      const posMap = new Map<string, { x: number; y: number }>()
      const allDeskIds = new Set<string>()
      for (const m of moves) {
        if (m.fromDesk !== '(unassigned)') allDeskIds.add(m.fromDesk)
        allDeskIds.add(m.toDesk)
      }
      for (const deskId of allDeskIds) {
        const el = document.querySelector(`[data-testid="desk-${deskId}"]`)
        if (el) {
          const rect = el.getBoundingClientRect()
          posMap.set(deskId, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          })
        }
      }
      setDeskPositions(posMap)
    }, 80)
    return () => clearTimeout(timer)
  }, [moves])

  // When all moves have completed their animations, fire the onComplete callback
  useEffect(() => {
    if (deskPositions && completedCount >= moves.length && moves.length > 0) {
      const timer = setTimeout(onComplete, POST_ANIMATION_DELAY)
      return () => clearTimeout(timer)
    }
  }, [completedCount, moves.length, deskPositions, onComplete])

  const handleMoveComplete = useCallback(() => {
    setCompletedCount((c) => c + 1)
  }, [])

  if (moves.length === 0) return null

  // While measuring positions, show a subtle overlay
  if (!deskPositions) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute inset-0 bg-black/5" />
      </div>
    )
  }

  const allDone = completedCount >= moves.length

  return (
    <motion.div
      className="fixed inset-0 z-50 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Subtle backdrop */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Progress banner */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-lg flex items-center gap-3">
          <motion.div
            animate={allDone ? { rotate: 0, scale: [1, 1.2, 1] } : { rotate: 360 }}
            transition={allDone ? { duration: 0.3 } : { duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <HiSwitchHorizontal className={`text-lg ${allDone ? 'text-green-500' : 'text-blue-500'}`} />
          </motion.div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {allDone
              ? 'All settled!'
              : `Moving ${Math.min(completedCount + 1, moves.length)} of ${moves.length}`}
          </div>
          <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${allDone ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
              animate={{ width: `${(completedCount / moves.length) * 100}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Animated employee chips flying between desks */}
      {moves.map((move, i) => {
        const emp = employeeMap.get(move.empId)
        if (!emp) return null

        const fromPos =
          move.fromDesk === '(unassigned)'
            ? { x: window.innerWidth - 80, y: 120 + i * 35 }
            : deskPositions.get(move.fromDesk)
        const toPos = deskPositions.get(move.toDesk)

        if (!fromPos || !toPos) return null

        const color = getDepartmentColor(emp.department)
        const delay = i * STAGGER_DELAY

        // Arc midpoint — rise above the straight-line path
        const midX = (fromPos.x + toPos.x) / 2
        const midY = Math.min(fromPos.y, toPos.y) - ARC_HEIGHT

        // Chip radius for centering the 40x40 div
        const r = 20

        return (
          <div key={move.empId}>
            {/* Destination desk highlight (subtle glow while the chip is in flight) */}
            <motion.div
              className="absolute pointer-events-none rounded-xl"
              style={{
                left: toPos.x - 48,
                top: toPos.y - 48,
                width: 96,
                height: 96,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.2, 0.2, 0] }}
              transition={{
                delay,
                duration: MOVE_DURATION,
                times: [0, 0.15, 0.8, 1],
              }}
            >
              <div
                className="w-full h-full rounded-xl"
                style={{ backgroundColor: color }}
              />
            </motion.div>

            {/* Flying avatar */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ left: 0, top: 0 }}
              initial={{
                x: fromPos.x - r,
                y: fromPos.y - r,
                scale: 1,
                opacity: 0,
              }}
              animate={{
                x: [fromPos.x - r, midX - r, toPos.x - r],
                y: [fromPos.y - r, midY - r, toPos.y - r],
                scale: [1, 1.35, 1],
                opacity: [0, 1, 1],
              }}
              transition={{
                duration: MOVE_DURATION,
                delay,
                ease: 'easeInOut',
                times: [0, 0.45, 1],
              }}
              onAnimationComplete={handleMoveComplete}
            >
              {/* Glow behind the avatar */}
              <div
                className="absolute inset-[-6px] rounded-full blur-lg opacity-40"
                style={{ backgroundColor: color }}
              />
              {/* Avatar circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xl relative z-10 ring-2 ring-white/80"
                style={{ backgroundColor: color }}
              >
                {emp.avatar}
              </div>
            </motion.div>

            {/* Landing ring pulse at destination */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                left: toPos.x - 24,
                top: toPos.y - 24,
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 2], opacity: [0.6, 0] }}
              transition={{
                delay: delay + MOVE_DURATION * 0.88,
                duration: 0.4,
                ease: 'easeOut',
              }}
            >
              <div
                className="w-12 h-12 rounded-full border-2"
                style={{ borderColor: color }}
              />
            </motion.div>
          </div>
        )
      })}
    </motion.div>
  )
}
