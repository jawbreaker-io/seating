export interface Employee {
  id: string
  name: string
  department: string
  avatar: string // initials-based color
}

export interface Desk {
  id: string
  row: number
  col: number
  zone: string
}

export interface Zone {
  id: string
  name: string
  color: string
  rows: number
  cols: number
}

export type SeatingMap = Record<string, string | null> // deskId -> employeeId | null

export interface DragItem {
  type: 'employee'
  employeeId: string
  sourceDeskId: string | null // null if from sidebar (unassigned)
}
