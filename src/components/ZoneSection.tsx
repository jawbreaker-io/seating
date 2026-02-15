import { motion } from 'motion/react'
import type { Zone, Desk, Employee } from '../types'
import { DeskSlot } from './DeskSlot'

interface ZoneSectionProps {
  zone: Zone
  desks: Desk[]
  getEmployee: (deskId: string) => Employee | null
  onDrop: (deskId: string, employeeId: string, sourceDeskId: string | null) => void
  onRemove: (deskId: string) => void
}

export function ZoneSection({
  zone,
  desks,
  getEmployee,
  onDrop,
  onRemove,
}: ZoneSectionProps) {
  return (
    <motion.div
      data-testid={`zone-${zone.id}`}
      className="rounded-2xl p-5 shadow-sm"
      style={{ backgroundColor: zone.color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{zone.name}</h3>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${zone.cols}, 5rem)`,
        }}
      >
        {desks.map((desk) => (
          <DeskSlot
            key={desk.id}
            desk={desk}
            employee={getEmployee(desk.id)}
            onDrop={onDrop}
            onRemove={onRemove}
          />
        ))}
      </div>
    </motion.div>
  )
}
