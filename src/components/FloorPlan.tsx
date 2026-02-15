import type { Zone, Desk, Employee } from '../types'
import { ZoneSection } from './ZoneSection'

interface FloorPlanProps {
  zones: Zone[]
  desks: Desk[]
  getEmployee: (deskId: string) => Employee | null
  onDrop: (deskId: string, employeeId: string, sourceDeskId: string | null) => void
  onRemove: (deskId: string) => void
}

export function FloorPlan({ zones, desks, getEmployee, onDrop, onRemove }: FloorPlanProps) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex flex-col gap-6 min-w-fit">
        {zones.map((zone) => (
          <ZoneSection
            key={zone.id}
            zone={zone}
            desks={desks.filter((d) => d.zone === zone.id)}
            getEmployee={getEmployee}
            onDrop={onDrop}
            onRemove={onRemove}
          />
        ))}
        {zones.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            No zones configured. Click &quot;Edit Layout&quot; to add zones.
          </div>
        )}
      </div>
    </div>
  )
}
