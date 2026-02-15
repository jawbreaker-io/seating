import type { Employee } from '../types'
import { zones, desks } from '../data'
import { ZoneSection } from './ZoneSection'

interface FloorPlanProps {
  getEmployee: (deskId: string) => Employee | null
  onDrop: (deskId: string, employeeId: string, sourceDeskId: string | null) => void
  onRemove: (deskId: string) => void
}

export function FloorPlan({ getEmployee, onDrop, onRemove }: FloorPlanProps) {
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
      </div>
    </div>
  )
}
