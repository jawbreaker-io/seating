import { motion } from 'motion/react'
import type { Zone, Desk, Employee, DeskNameMap, UnavailableDeskMap, PinnedDeskMap } from '../types'
import { DeskSlot } from './DeskSlot'

interface ZoneSectionProps {
  zone: Zone
  desks: Desk[]
  deskNames: DeskNameMap
  unavailableDesks: UnavailableDeskMap
  pinnedDesks: PinnedDeskMap
  getEmployee: (deskId: string) => Employee | null
  getDepartmentColor: (department: string) => string
  onDrop: (deskId: string, employeeId: string, sourceDeskId: string | null) => void
  onRemove: (deskId: string) => void
  onDeskNameChange: (deskId: string, name: string) => void
  onToggleDeskUnavailable: (deskId: string, unavailable: boolean) => void
  onTogglePin: (deskId: string) => void
}

export function ZoneSection({
  zone,
  desks,
  deskNames,
  unavailableDesks,
  pinnedDesks,
  getEmployee,
  getDepartmentColor,
  onDrop,
  onRemove,
  onDeskNameChange,
  onToggleDeskUnavailable,
  onTogglePin,
}: ZoneSectionProps) {
  return (
    <motion.div
      data-testid={`zone-${zone.id}`}
      className="rounded-2xl p-6 shadow-sm"
      style={{ backgroundColor: zone.color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{zone.name}</h3>
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(${zone.cols}, 7rem)`,
        }}
      >
        {desks.map((desk) => (
          <DeskSlot
            key={desk.id}
            desk={desk}
            employee={getEmployee(desk.id)}
            getDepartmentColor={getDepartmentColor}
            name={deskNames[desk.id]}
            unavailable={!!unavailableDesks[desk.id]}
            pinned={!!pinnedDesks[desk.id]}
            onDrop={onDrop}
            onRemove={onRemove}
            onNameChange={onDeskNameChange}
            onToggleUnavailable={onToggleDeskUnavailable}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    </motion.div>
  )
}
